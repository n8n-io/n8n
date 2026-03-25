(function run() {
  const Socket = window.SimpleWebsocket;
  const port = window.__OPENAPI_CLI_WS_PORT;
  const host = window.__OPENAPI_CLI_WS_HOST;

  let socket;

  reconnect();

  function getFormattedHost() {
    // Use localhost when bound to all interfaces
    if (host === '::' || host === '0.0.0.0') {
      return 'localhost';
    }

    // Other IPv6 addresses must be wrapped in brackets
    if (host.includes('::')) {
      return `[${host}]`;
    }

    // Otherwise return as-is
    return host;
  }

  function reconnect() {
    socket = new Socket(`ws://${getFormattedHost()}:${port}`);
    socket.on('connect', () => {
      socket.send('{"type": "ping"}');
    });

    socket.on('data', (data) => {
      const message = JSON.parse(data);
      switch (message.type) {
        case 'pong':
          console.log('[hot] hot reloading connected');
          break;
        case 'reload':
          console.log('[hot] full page reload');
          window.location.reload();
          break;
        default:
          console.log(`[hot] ${message.type} received`);
      }
    });

    socket.on('close', () => {
      socket.destroy();
      console.log('[hot] Connection lost, trying to reconnect in 4s');
      setTimeout(() => {
        reconnect();
      }, 4000);
    });

    socket.on('error', () => {
      console.log('[hot] Error connecting to hot reloading server');
      socket.destroy();
    });
  }
})();
