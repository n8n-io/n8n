var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/extend-expect.ts
import { expect } from "vitest";

// src/matchers/index.ts
var matchers_exports = {};
__export(matchers_exports, {
  toHaveReceivedMessages: () => toHaveReceivedMessages_default,
  toReceiveMessage: () => toReceiveMessage_default
});

// src/websocket.ts
import { Server } from "mock-socket";

// src/act-compat.ts
var act;
try {
  act = __require("@testing-library/react").act;
} catch (_) {
  act = (callback) => {
    callback();
  };
}
var act_compat_default = act;

// src/queue.ts
var Queue = class {
  pendingItems = [];
  nextItemResolver;
  nextItem = new Promise((done) => this.nextItemResolver = done);
  put(item) {
    this.pendingItems.push(item);
    this.nextItemResolver();
    this.nextItem = new Promise((done) => this.nextItemResolver = done);
  }
  get() {
    const item = this.pendingItems.shift();
    if (item) {
      return Promise.resolve(item);
    }
    let resolver;
    const nextItemPromise = new Promise((done) => resolver = done);
    this.nextItem.then(() => {
      resolver(this.pendingItems.shift());
    });
    return nextItemPromise;
  }
};

// src/websocket.ts
var identity = (x) => x;
var WS = class _WS {
  server;
  serializer;
  deserializer;
  static instances = [];
  messages = [];
  messagesToConsume = new Queue();
  _isConnected;
  _isClosed;
  static clean() {
    _WS.instances.forEach((instance) => {
      instance.close();
      instance.messages = [];
    });
    _WS.instances = [];
  }
  constructor(url, opts = {}) {
    _WS.instances.push(this);
    const { jsonProtocol = false, ...serverOptions } = opts;
    this.serializer = jsonProtocol ? JSON.stringify : identity;
    this.deserializer = jsonProtocol ? JSON.parse : identity;
    let connectionResolver;
    let closedResolver;
    this._isConnected = new Promise((done) => connectionResolver = done);
    this._isClosed = new Promise((done) => closedResolver = done);
    this.server = new Server(url, serverOptions);
    this.server.on("close", closedResolver);
    this.server.on("connection", (socket) => {
      connectionResolver(socket);
      socket.on("message", (message) => {
        const parsedMessage = this.deserializer(message);
        this.messages.push(parsedMessage);
        this.messagesToConsume.put(parsedMessage);
      });
    });
  }
  get connected() {
    let resolve;
    const connectedPromise = new Promise((done) => resolve = done);
    const waitForConnected = async () => {
      await act_compat_default(async () => {
        await this._isConnected;
      });
      resolve(await this._isConnected);
    };
    waitForConnected();
    return connectedPromise;
  }
  get closed() {
    let resolve;
    const closedPromise = new Promise((done) => resolve = done);
    const waitForclosed = async () => {
      await act_compat_default(async () => {
        await this._isClosed;
      });
      await this._isClosed;
      resolve();
    };
    waitForclosed();
    return closedPromise;
  }
  get nextMessage() {
    return this.messagesToConsume.get();
  }
  on(eventName, callback) {
    this.server.on(eventName, callback);
  }
  send(message) {
    act_compat_default(() => {
      this.server.emit("message", this.serializer(message));
    });
  }
  close(options) {
    act_compat_default(() => {
      this.server.close(options);
    });
  }
  error(options) {
    act_compat_default(() => {
      this.server.emit("error", null);
    });
    this.server.close(options);
  }
};

// src/derivers/makeInvalidWsMessage.ts
function makeInvalidWsMessage(ws, matcher) {
  return this.utils.matcherHint(this.isNot ? `.not.${matcher}` : `.${matcher}`, "WS", "expected") + `

Expected the websocket object to be a valid WS mock.
Received: ${typeof ws}
  ${this.utils.printReceived(ws)}`;
}

// src/derivers/deriveToHaveReceivedMessage.ts
function deriveToHaveReceivedMessage(name, fn) {
  return function(ws, expected, options) {
    const isWS = ws instanceof WS;
    if (!isWS) {
      return {
        pass: this.isNot,
        // always fail
        message: makeInvalidWsMessage.bind(this, ws, name)
      };
    }
    return fn.call(this, ws.messages, expected, options);
  };
}

// src/derivers/deriveToReceiveMessage.ts
var WAIT_DELAY = 1e3;
var TIMEOUT = Symbol("timeout");
function deriveToReceiveMessage(name, fn) {
  return async function(ws, expected, options) {
    const isWS = ws instanceof WS;
    if (!isWS) {
      return {
        pass: this.isNot,
        // always fail
        message: makeInvalidWsMessage.bind(this, ws, name)
      };
    }
    const waitDelay = options?.timeout ?? WAIT_DELAY;
    const messageOrTimeout = await Promise.race([
      ws.nextMessage,
      new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), waitDelay))
    ]);
    if (messageOrTimeout === TIMEOUT) {
      return {
        pass: this.isNot,
        // always fail
        message: () => this.utils.matcherHint(`${this.isNot ? ".not" : ""}.${name}`, "WS", "expected") + `

Expected the websocket server to receive a message,
but it didn't receive anything in ${waitDelay}ms.`
      };
    } else {
      const received = messageOrTimeout;
      return Promise.resolve(fn.call(this, received, expected, options));
    }
  };
}

// src/matchers/toHaveReceivedMessages.ts
var toHaveReceivedMessages = deriveToHaveReceivedMessage(
  "toHaveReceivedMessages",
  function(received, expected) {
    const equalities = expected.map(
      (expectedMsg) => (
        // object comparison to handle JSON protocols
        received.some((receivedMsg) => this.equals(receivedMsg, expectedMsg))
      )
    );
    const pass = this.isNot ? equalities.some(Boolean) : equalities.every(Boolean);
    const message = pass ? () => this.utils.matcherHint(".not.toHaveReceivedMessages", "WS", "expected") + `

Expected the WS server to not have received the following messages:
  ${this.utils.printExpected(expected)}
But it received:
  ${this.utils.printReceived(received)}` : () => {
      return this.utils.matcherHint(".toHaveReceivedMessages", "WS", "expected") + `

Expected the WS server to have received the following messages:
  ${this.utils.printExpected(expected)}
Received:
  ${this.utils.printReceived(received)}

`;
    };
    return {
      actual: received,
      expected,
      message,
      pass
    };
  }
);
var toHaveReceivedMessages_default = toHaveReceivedMessages;

// src/matchers/toReceiveMessage.ts
import { diff } from "@vitest/utils/diff";
var toReceiveMessage = deriveToReceiveMessage("toReceiveMessage", function(received, expected) {
  const pass = this.equals(received, expected);
  const message = pass ? () => this.utils.matcherHint(".not.toReceiveMessage", "WS", "expected") + `

Expected the next received message to not equal:
  ${this.utils.printExpected(expected)}
Received:
  ${this.utils.printReceived(received)}` : () => {
    const diffString = diff(expected, received, { expand: this.expand });
    return this.utils.matcherHint(".toReceiveMessage", "WS", "expected") + `

Expected the next received message to equal:
  ${this.utils.printExpected(expected)}
Received:
  ${this.utils.printReceived(received)}

Difference:

${diffString}`;
  };
  return {
    actual: received,
    expected,
    message,
    pass
  };
});
var toReceiveMessage_default = toReceiveMessage;

// src/extend-expect.ts
expect.extend(matchers_exports);
export {
  WS,
  WS as default,
  deriveToHaveReceivedMessage,
  deriveToReceiveMessage
};
