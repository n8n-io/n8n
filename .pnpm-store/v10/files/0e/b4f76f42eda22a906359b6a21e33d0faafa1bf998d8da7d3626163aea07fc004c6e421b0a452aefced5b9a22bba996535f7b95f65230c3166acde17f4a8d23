/** @type {Map<string, MessagePort>} */ const mapClientIdToPort = new Map();

globalThis.addEventListener('connect', event => {
  // The first message from a client associates the clientId with the port.
  const workerPort = event.ports[0];
  workerPort.addEventListener('message', event => {
    mapClientIdToPort.set(event.data.clientId, workerPort);

    // Remove the entry when the client goes away, which we detect when
    // the lock on its name becomes available.
    navigator.locks.request(event.data.clientId, { mode: 'shared' }, () => {
      mapClientIdToPort.get(event.data.clientId)?.close();
      mapClientIdToPort.delete(event.data.clientId);
    });

    // Subsequent messages will be forwarded.
    workerPort.addEventListener('message', event => {
      const port = mapClientIdToPort.get(event.data.clientId);
      port.postMessage(event.data, event.ports);
    });
  }, { once: true });
  workerPort.start();
});