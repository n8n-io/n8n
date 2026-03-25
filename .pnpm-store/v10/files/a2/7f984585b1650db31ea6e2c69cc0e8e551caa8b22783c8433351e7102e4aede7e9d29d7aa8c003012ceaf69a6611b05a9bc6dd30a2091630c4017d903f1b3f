"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _chunkPFGO5BSMjs = require('../../chunk-PFGO5BSM.js');



var _chunkTIPR373Rjs = require('../../chunk-TIPR373R.js');

// src/interceptors/WebSocket/utils/bindEvent.ts
function bindEvent(target, event) {
  Object.defineProperties(event, {
    target: {
      value: target,
      enumerable: true,
      writable: true
    },
    currentTarget: {
      value: target,
      enumerable: true,
      writable: true
    }
  });
  return event;
}

// src/interceptors/WebSocket/utils/events.ts
var kCancelable = Symbol("kCancelable");
var kDefaultPrevented = Symbol("kDefaultPrevented");
var CancelableMessageEvent = class extends MessageEvent {
  constructor(type, init) {
    super(type, init);
    this[kCancelable] = !!init.cancelable;
    this[kDefaultPrevented] = false;
  }
  get cancelable() {
    return this[kCancelable];
  }
  set cancelable(nextCancelable) {
    this[kCancelable] = nextCancelable;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented];
  }
  set defaultPrevented(nextDefaultPrevented) {
    this[kDefaultPrevented] = nextDefaultPrevented;
  }
  preventDefault() {
    if (this.cancelable && !this[kDefaultPrevented]) {
      this[kDefaultPrevented] = true;
    }
  }
};
kCancelable, kDefaultPrevented;
var CloseEvent = class extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.code = init.code === void 0 ? 0 : init.code;
    this.reason = init.reason === void 0 ? "" : init.reason;
    this.wasClean = init.wasClean === void 0 ? false : init.wasClean;
  }
};
var CancelableCloseEvent = class extends CloseEvent {
  constructor(type, init = {}) {
    super(type, init);
    this[kCancelable] = !!init.cancelable;
    this[kDefaultPrevented] = false;
  }
  get cancelable() {
    return this[kCancelable];
  }
  set cancelable(nextCancelable) {
    this[kCancelable] = nextCancelable;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented];
  }
  set defaultPrevented(nextDefaultPrevented) {
    this[kDefaultPrevented] = nextDefaultPrevented;
  }
  preventDefault() {
    if (this.cancelable && !this[kDefaultPrevented]) {
      this[kDefaultPrevented] = true;
    }
  }
};
kCancelable, kDefaultPrevented;

// src/interceptors/WebSocket/WebSocketClientConnection.ts
var kEmitter = Symbol("kEmitter");
var kBoundListener = Symbol("kBoundListener");
var WebSocketClientConnection = class {
  constructor(socket, transport) {
    this.socket = socket;
    this.transport = transport;
    this.id = _chunkTIPR373Rjs.createRequestId.call(void 0, );
    this.url = new URL(socket.url);
    this[kEmitter] = new EventTarget();
    this.transport.addEventListener("outgoing", (event) => {
      const message = bindEvent(
        this.socket,
        new CancelableMessageEvent("message", {
          data: event.data,
          origin: event.origin,
          cancelable: true
        })
      );
      this[kEmitter].dispatchEvent(message);
      if (message.defaultPrevented) {
        event.preventDefault();
      }
    });
    this.transport.addEventListener("close", (event) => {
      this[kEmitter].dispatchEvent(
        bindEvent(this.socket, new CloseEvent("close", event))
      );
    });
  }
  /**
   * Listen for the outgoing events from the connected WebSocket client.
   */
  addEventListener(type, listener, options) {
    if (!Reflect.has(listener, kBoundListener)) {
      const boundListener = listener.bind(this.socket);
      Object.defineProperty(listener, kBoundListener, {
        value: boundListener,
        enumerable: false,
        configurable: false
      });
    }
    this[kEmitter].addEventListener(
      type,
      Reflect.get(listener, kBoundListener),
      options
    );
  }
  /**
   * Removes the listener for the given event.
   */
  removeEventListener(event, listener, options) {
    this[kEmitter].removeEventListener(
      event,
      Reflect.get(listener, kBoundListener),
      options
    );
  }
  /**
   * Send data to the connected client.
   */
  send(data) {
    this.transport.send(data);
  }
  /**
   * Close the WebSocket connection.
   * @param {number} code A status code (see https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1).
   * @param {string} reason A custom connection close reason.
   */
  close(code, reason) {
    this.transport.close(code, reason);
  }
};
kEmitter;

// src/interceptors/WebSocket/WebSocketServerConnection.ts
var _outvariant = require('outvariant');

// src/interceptors/WebSocket/WebSocketOverride.ts

var _deferredpromise = require('@open-draft/deferred-promise');
var WEBSOCKET_CLOSE_CODE_RANGE_ERROR = "InvalidAccessError: close code out of user configurable range";
var kPassthroughPromise = Symbol("kPassthroughPromise");
var kOnSend = Symbol("kOnSend");
var kClose = Symbol("kClose");
var WebSocketOverride = class extends EventTarget {
  constructor(url, protocols) {
    super();
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
    this._onopen = null;
    this._onmessage = null;
    this._onerror = null;
    this._onclose = null;
    this.url = url.toString();
    this.protocol = "";
    this.extensions = "";
    this.binaryType = "blob";
    this.readyState = this.CONNECTING;
    this.bufferedAmount = 0;
    this[kPassthroughPromise] = new (0, _deferredpromise.DeferredPromise)();
    queueMicrotask(async () => {
      if (await this[kPassthroughPromise]) {
        return;
      }
      this.protocol = typeof protocols === "string" ? protocols : Array.isArray(protocols) && protocols.length > 0 ? protocols[0] : "";
      if (this.readyState === this.CONNECTING) {
        this.readyState = this.OPEN;
        this.dispatchEvent(bindEvent(this, new Event("open")));
      }
    });
  }
  set onopen(listener) {
    this.removeEventListener("open", this._onopen);
    this._onopen = listener;
    if (listener !== null) {
      this.addEventListener("open", listener);
    }
  }
  get onopen() {
    return this._onopen;
  }
  set onmessage(listener) {
    this.removeEventListener(
      "message",
      this._onmessage
    );
    this._onmessage = listener;
    if (listener !== null) {
      this.addEventListener("message", listener);
    }
  }
  get onmessage() {
    return this._onmessage;
  }
  set onerror(listener) {
    this.removeEventListener("error", this._onerror);
    this._onerror = listener;
    if (listener !== null) {
      this.addEventListener("error", listener);
    }
  }
  get onerror() {
    return this._onerror;
  }
  set onclose(listener) {
    this.removeEventListener("close", this._onclose);
    this._onclose = listener;
    if (listener !== null) {
      this.addEventListener("close", listener);
    }
  }
  get onclose() {
    return this._onclose;
  }
  /**
   * @see https://websockets.spec.whatwg.org/#ref-for-dom-websocket-send%E2%91%A0
   */
  send(data) {
    if (this.readyState === this.CONNECTING) {
      this.close();
      throw new DOMException("InvalidStateError");
    }
    if (this.readyState === this.CLOSING || this.readyState === this.CLOSED) {
      return;
    }
    this.bufferedAmount += getDataSize(data);
    queueMicrotask(() => {
      var _a;
      this.bufferedAmount = 0;
      (_a = this[kOnSend]) == null ? void 0 : _a.call(this, data);
    });
  }
  close(code = 1e3, reason) {
    _outvariant.invariant.call(void 0, code, WEBSOCKET_CLOSE_CODE_RANGE_ERROR);
    _outvariant.invariant.call(void 0, 
      code === 1e3 || code >= 3e3 && code <= 4999,
      WEBSOCKET_CLOSE_CODE_RANGE_ERROR
    );
    this[kClose](code, reason);
  }
  [(kPassthroughPromise, kOnSend, kClose)](code = 1e3, reason, wasClean = true) {
    if (this.readyState === this.CLOSING || this.readyState === this.CLOSED) {
      return;
    }
    this.readyState = this.CLOSING;
    queueMicrotask(() => {
      this.readyState = this.CLOSED;
      this.dispatchEvent(
        bindEvent(
          this,
          new CloseEvent("close", {
            code,
            reason,
            wasClean
          })
        )
      );
      this._onopen = null;
      this._onmessage = null;
      this._onerror = null;
      this._onclose = null;
    });
  }
  addEventListener(type, listener, options) {
    return super.addEventListener(
      type,
      listener,
      options
    );
  }
  removeEventListener(type, callback, options) {
    return super.removeEventListener(type, callback, options);
  }
};
WebSocketOverride.CONNECTING = 0;
WebSocketOverride.OPEN = 1;
WebSocketOverride.CLOSING = 2;
WebSocketOverride.CLOSED = 3;
function getDataSize(data) {
  if (typeof data === "string") {
    return data.length;
  }
  if (data instanceof Blob) {
    return data.size;
  }
  return data.byteLength;
}

// src/interceptors/WebSocket/WebSocketServerConnection.ts
var kEmitter2 = Symbol("kEmitter");
var kBoundListener2 = Symbol("kBoundListener");
var kSend = Symbol("kSend");
var WebSocketServerConnection = class {
  constructor(client, transport, createConnection) {
    this.client = client;
    this.transport = transport;
    this.createConnection = createConnection;
    this[kEmitter2] = new EventTarget();
    this.mockCloseController = new AbortController();
    this.realCloseController = new AbortController();
    this.transport.addEventListener("outgoing", (event) => {
      if (typeof this.realWebSocket === "undefined") {
        return;
      }
      queueMicrotask(() => {
        if (!event.defaultPrevented) {
          this[kSend](event.data);
        }
      });
    });
    this.transport.addEventListener(
      "incoming",
      this.handleIncomingMessage.bind(this)
    );
  }
  /**
   * The `WebSocket` instance connected to the original server.
   * Accessing this before calling `server.connect()` will throw.
   */
  get socket() {
    _outvariant.invariant.call(void 0, 
      this.realWebSocket,
      'Cannot access "socket" on the original WebSocket server object: the connection is not open. Did you forget to call `server.connect()`?'
    );
    return this.realWebSocket;
  }
  /**
   * Open connection to the original WebSocket server.
   */
  connect() {
    _outvariant.invariant.call(void 0, 
      !this.realWebSocket || this.realWebSocket.readyState !== WebSocket.OPEN,
      'Failed to call "connect()" on the original WebSocket instance: the connection already open'
    );
    const realWebSocket = this.createConnection();
    realWebSocket.binaryType = this.client.binaryType;
    realWebSocket.addEventListener(
      "open",
      (event) => {
        this[kEmitter2].dispatchEvent(
          bindEvent(this.realWebSocket, new Event("open", event))
        );
      },
      { once: true }
    );
    realWebSocket.addEventListener("message", (event) => {
      this.transport.dispatchEvent(
        bindEvent(
          this.realWebSocket,
          new MessageEvent("incoming", {
            data: event.data,
            origin: event.origin
          })
        )
      );
    });
    this.client.addEventListener(
      "close",
      (event) => {
        this.handleMockClose(event);
      },
      {
        signal: this.mockCloseController.signal
      }
    );
    realWebSocket.addEventListener(
      "close",
      (event) => {
        this.handleRealClose(event);
      },
      {
        signal: this.realCloseController.signal
      }
    );
    realWebSocket.addEventListener("error", () => {
      const errorEvent = bindEvent(
        realWebSocket,
        new Event("error", { cancelable: true })
      );
      this[kEmitter2].dispatchEvent(errorEvent);
      if (!errorEvent.defaultPrevented) {
        this.client.dispatchEvent(bindEvent(this.client, new Event("error")));
      }
    });
    this.realWebSocket = realWebSocket;
  }
  /**
   * Listen for the incoming events from the original WebSocket server.
   */
  addEventListener(event, listener, options) {
    if (!Reflect.has(listener, kBoundListener2)) {
      const boundListener = listener.bind(this.client);
      Object.defineProperty(listener, kBoundListener2, {
        value: boundListener,
        enumerable: false
      });
    }
    this[kEmitter2].addEventListener(
      event,
      Reflect.get(listener, kBoundListener2),
      options
    );
  }
  /**
   * Remove the listener for the given event.
   */
  removeEventListener(event, listener, options) {
    this[kEmitter2].removeEventListener(
      event,
      Reflect.get(listener, kBoundListener2),
      options
    );
  }
  /**
   * Send data to the original WebSocket server.
   * @example
   * server.send('hello')
   * server.send(new Blob(['hello']))
   * server.send(new TextEncoder().encode('hello'))
   */
  send(data) {
    this[kSend](data);
  }
  [(kEmitter2, kSend)](data) {
    const { realWebSocket } = this;
    _outvariant.invariant.call(void 0, 
      realWebSocket,
      'Failed to call "server.send()" for "%s": the connection is not open. Did you forget to call "server.connect()"?',
      this.client.url
    );
    if (realWebSocket.readyState === WebSocket.CLOSING || realWebSocket.readyState === WebSocket.CLOSED) {
      return;
    }
    if (realWebSocket.readyState === WebSocket.CONNECTING) {
      realWebSocket.addEventListener(
        "open",
        () => {
          realWebSocket.send(data);
        },
        { once: true }
      );
      return;
    }
    realWebSocket.send(data);
  }
  /**
   * Close the actual server connection.
   */
  close() {
    const { realWebSocket } = this;
    _outvariant.invariant.call(void 0, 
      realWebSocket,
      'Failed to close server connection for "%s": the connection is not open. Did you forget to call "server.connect()"?',
      this.client.url
    );
    this.realCloseController.abort();
    if (realWebSocket.readyState === WebSocket.CLOSING || realWebSocket.readyState === WebSocket.CLOSED) {
      return;
    }
    realWebSocket.close();
    queueMicrotask(() => {
      this[kEmitter2].dispatchEvent(
        bindEvent(
          this.realWebSocket,
          new CancelableCloseEvent("close", {
            /**
             * @note `server.close()` in the interceptor
             * always results in clean closures.
             */
            code: 1e3,
            cancelable: true
          })
        )
      );
    });
  }
  handleIncomingMessage(event) {
    const messageEvent = bindEvent(
      event.target,
      new CancelableMessageEvent("message", {
        data: event.data,
        origin: event.origin,
        cancelable: true
      })
    );
    this[kEmitter2].dispatchEvent(messageEvent);
    if (!messageEvent.defaultPrevented) {
      this.client.dispatchEvent(
        bindEvent(
          /**
           * @note Bind the forwarded original server events
           * to the mock WebSocket instance so it would
           * dispatch them straight away.
           */
          this.client,
          // Clone the message event again to prevent
          // the "already being dispatched" exception.
          new MessageEvent("message", {
            data: event.data,
            origin: event.origin
          })
        )
      );
    }
  }
  handleMockClose(_event) {
    if (this.realWebSocket) {
      this.realWebSocket.close();
    }
  }
  handleRealClose(event) {
    this.mockCloseController.abort();
    const closeEvent = bindEvent(
      this.realWebSocket,
      new CancelableCloseEvent("close", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        cancelable: true
      })
    );
    this[kEmitter2].dispatchEvent(closeEvent);
    if (!closeEvent.defaultPrevented) {
      this.client[kClose](event.code, event.reason);
    }
  }
};

// src/interceptors/WebSocket/WebSocketClassTransport.ts
var WebSocketClassTransport = class extends EventTarget {
  constructor(socket) {
    super();
    this.socket = socket;
    this.socket.addEventListener("close", (event) => {
      this.dispatchEvent(bindEvent(this.socket, new CloseEvent("close", event)));
    });
    this.socket[kOnSend] = (data) => {
      this.dispatchEvent(
        bindEvent(
          this.socket,
          // Dispatch this as cancelable because "client" connection
          // re-creates this message event (cannot dispatch the same event).
          new CancelableMessageEvent("outgoing", {
            data,
            origin: this.socket.url,
            cancelable: true
          })
        )
      );
    };
  }
  addEventListener(type, callback, options) {
    return super.addEventListener(type, callback, options);
  }
  dispatchEvent(event) {
    return super.dispatchEvent(event);
  }
  send(data) {
    queueMicrotask(() => {
      if (this.socket.readyState === this.socket.CLOSING || this.socket.readyState === this.socket.CLOSED) {
        return;
      }
      const dispatchEvent = () => {
        this.socket.dispatchEvent(
          bindEvent(
            /**
             * @note Setting this event's "target" to the
             * WebSocket override instance is important.
             * This way it can tell apart original incoming events
             * (must be forwarded to the transport) from the
             * mocked message events like the one below
             * (must be dispatched on the client instance).
             */
            this.socket,
            new MessageEvent("message", {
              data,
              origin: this.socket.url
            })
          )
        );
      };
      if (this.socket.readyState === this.socket.CONNECTING) {
        this.socket.addEventListener(
          "open",
          () => {
            dispatchEvent();
          },
          { once: true }
        );
      } else {
        dispatchEvent();
      }
    });
  }
  close(code, reason) {
    this.socket[kClose](code, reason);
  }
};

// src/interceptors/WebSocket/index.ts
var _WebSocketInterceptor = class extends _chunkTIPR373Rjs.Interceptor {
  constructor() {
    super(_WebSocketInterceptor.symbol);
  }
  checkEnvironment() {
    return _chunkPFGO5BSMjs.hasConfigurableGlobal.call(void 0, "WebSocket");
  }
  setup() {
    const originalWebSocketDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebSocket"
    );
    const WebSocketProxy = new Proxy(globalThis.WebSocket, {
      construct: (target, args, newTarget) => {
        const [url, protocols] = args;
        const createConnection = () => {
          return Reflect.construct(target, args, newTarget);
        };
        const socket = new WebSocketOverride(url, protocols);
        const transport = new WebSocketClassTransport(socket);
        queueMicrotask(() => {
          try {
            const server = new WebSocketServerConnection(
              socket,
              transport,
              createConnection
            );
            const hasConnectionListeners = this.emitter.emit("connection", {
              client: new WebSocketClientConnection(socket, transport),
              server,
              info: {
                protocols
              }
            });
            if (hasConnectionListeners) {
              socket[kPassthroughPromise].resolve(false);
            } else {
              socket[kPassthroughPromise].resolve(true);
              server.connect();
              server.addEventListener("open", () => {
                socket.dispatchEvent(bindEvent(socket, new Event("open")));
                if (server["realWebSocket"]) {
                  socket.protocol = server["realWebSocket"].protocol;
                }
              });
            }
          } catch (error) {
            if (error instanceof Error) {
              socket.dispatchEvent(new Event("error"));
              if (socket.readyState !== WebSocket.CLOSING && socket.readyState !== WebSocket.CLOSED) {
                socket[kClose](1011, error.message, false);
              }
              console.error(error);
            }
          }
        });
        return socket;
      }
    });
    Object.defineProperty(globalThis, "WebSocket", {
      value: WebSocketProxy,
      configurable: true
    });
    this.subscriptions.push(() => {
      Object.defineProperty(
        globalThis,
        "WebSocket",
        originalWebSocketDescriptor
      );
    });
  }
};
var WebSocketInterceptor = _WebSocketInterceptor;
WebSocketInterceptor.symbol = Symbol("websocket");




exports.WebSocketClientConnection = WebSocketClientConnection; exports.WebSocketInterceptor = WebSocketInterceptor; exports.WebSocketServerConnection = WebSocketServerConnection;
//# sourceMappingURL=index.js.map