'use strict';

var observable = require('./observable.cjs');
var time = require('./time-d8438852.cjs');
var math = require('./math-96d5e8c4.cjs');

/* eslint-env browser */

const reconnectTimeoutBase = 1200;
const maxReconnectTimeout = 2500;
// @todo - this should depend on awareness.outdatedTime
const messageReconnectTimeout = 30000;

/**
 * @param {WebsocketClient} wsclient
 */
const setupWS = (wsclient) => {
  if (wsclient.shouldConnect && wsclient.ws === null) {
    const websocket = new WebSocket(wsclient.url);
    const binaryType = wsclient.binaryType;
    /**
     * @type {any}
     */
    let pingTimeout = null;
    if (binaryType) {
      websocket.binaryType = binaryType;
    }
    wsclient.ws = websocket;
    wsclient.connecting = true;
    wsclient.connected = false;
    websocket.onmessage = event => {
      wsclient.lastMessageReceived = time.getUnixTime();
      const data = event.data;
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      if (message && message.type === 'pong') {
        clearTimeout(pingTimeout);
        pingTimeout = setTimeout(sendPing, messageReconnectTimeout / 2);
      }
      wsclient.emit('message', [message, wsclient]);
    };
    /**
     * @param {any} error
     */
    const onclose = error => {
      if (wsclient.ws !== null) {
        wsclient.ws = null;
        wsclient.connecting = false;
        if (wsclient.connected) {
          wsclient.connected = false;
          wsclient.emit('disconnect', [{ type: 'disconnect', error }, wsclient]);
        } else {
          wsclient.unsuccessfulReconnects++;
        }
        // Start with no reconnect timeout and increase timeout by
        // log10(wsUnsuccessfulReconnects).
        // The idea is to increase reconnect timeout slowly and have no reconnect
        // timeout at the beginning (log(1) = 0)
        setTimeout(setupWS, math.min(math.log10(wsclient.unsuccessfulReconnects + 1) * reconnectTimeoutBase, maxReconnectTimeout), wsclient);
      }
      clearTimeout(pingTimeout);
    };
    const sendPing = () => {
      if (wsclient.ws === websocket) {
        wsclient.send({
          type: 'ping'
        });
      }
    };
    websocket.onclose = () => onclose(null);
    websocket.onerror = error => onclose(error);
    websocket.onopen = () => {
      wsclient.lastMessageReceived = time.getUnixTime();
      wsclient.connecting = false;
      wsclient.connected = true;
      wsclient.unsuccessfulReconnects = 0;
      wsclient.emit('connect', [{ type: 'connect' }, wsclient]);
      // set ping
      pingTimeout = setTimeout(sendPing, messageReconnectTimeout / 2);
    };
  }
};

/**
 * @deprecated
 * @extends Observable<string>
 */
class WebsocketClient extends observable.Observable {
  /**
   * @param {string} url
   * @param {object} opts
   * @param {'arraybuffer' | 'blob' | null} [opts.binaryType] Set `ws.binaryType`
   */
  constructor (url, { binaryType } = {}) {
    super();
    this.url = url;
    /**
     * @type {WebSocket?}
     */
    this.ws = null;
    this.binaryType = binaryType || null;
    this.connected = false;
    this.connecting = false;
    this.unsuccessfulReconnects = 0;
    this.lastMessageReceived = 0;
    /**
     * Whether to connect to other peers or not
     * @type {boolean}
     */
    this.shouldConnect = true;
    this._checkInterval = setInterval(() => {
      if (this.connected && messageReconnectTimeout < time.getUnixTime() - this.lastMessageReceived) {
        // no message received in a long time - not even your own awareness
        // updates (which are updated every 15 seconds)
        /** @type {WebSocket} */ (this.ws).close();
      }
    }, messageReconnectTimeout / 2);
    setupWS(this);
  }

  /**
   * @param {any} message
   */
  send (message) {
    if (this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  destroy () {
    clearInterval(this._checkInterval);
    this.disconnect();
    super.destroy();
  }

  disconnect () {
    this.shouldConnect = false;
    if (this.ws !== null) {
      this.ws.close();
    }
  }

  connect () {
    this.shouldConnect = true;
    if (!this.connected && this.ws === null) {
      setupWS(this);
    }
  }
}

var websocket = /*#__PURE__*/Object.freeze({
  __proto__: null,
  WebsocketClient: WebsocketClient
});

exports.WebsocketClient = WebsocketClient;
exports.websocket = websocket;
//# sourceMappingURL=websocket-b073d0fc.cjs.map
