const net = require('net');
const http = require('http');

// Configuration
const HOME_IP = '165.120.113.41';
const HOME_PORT = 8080;
const PROXY_PORT = 8080; // Port this backend listens on
const PROXY_HOST = '0.0.0.0'; // Listen on all interfaces

// HTTP status endpoint
const httpServer = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'online',
      proxying_to: `${HOME_IP}:${HOME_PORT}`,
      note: 'Connect your Minecraft client to this server\'s domain on port 25577'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Minecraft Proxy Server\nProxying connections to ' + HOME_IP + ':' + HOME_PORT);
  }
});

// TCP proxy for Minecraft (accepts on 25577, forwards to home:8080)
const tcpServer = net.createServer((clientSocket) => {
  console.log(`[${new Date().toISOString()}] Client connected from ${clientSocket.remoteAddress}`);

  const serverSocket = net.createConnection(HOME_PORT, HOME_IP, () => {
    console.log(`[${new Date().toISOString()}] Connected to home server at ${HOME_IP}:${HOME_PORT}`);
  });

  serverSocket.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Home server error:`, err.message);
    clientSocket.destroy();
  });

  clientSocket.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Client error:`, err.message);
    serverSocket.destroy();
  });

  // Proxy data both directions
  clientSocket.pipe(serverSocket);
  serverSocket.pipe(clientSocket);

  clientSocket.on('end', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected`);
    serverSocket.end();
  });

  serverSocket.on('end', () => {
    clientSocket.end();
  });
});

// Listen for Minecraft connections on port 25577
tcpServer.listen(25577, PROXY_HOST, () => {
  console.log(`[${new Date().toISOString()}] Minecraft proxy listening on port 25577`);
  console.log(`Forwarding to: ${HOME_IP}:${HOME_PORT}`);
});

// HTTP status on port 8080
httpServer.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log(`[${new Date().toISOString()}] Status server on port 8080`);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  httpServer.close();
  tcpServer.close();
  process.exit(0);
});
