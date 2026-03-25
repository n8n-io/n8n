"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var chat_exports = {};
__export(chat_exports, {
  Chat: () => Chat,
  asString: () => asString
});
module.exports = __toCommonJS(chat_exports);
var import_transport = require("../transport");
class Chat {
  constructor(wsEndpoint) {
    this._history = [];
    this._chatSinks = /* @__PURE__ */ new Map();
    this._wsEndpoint = wsEndpoint;
  }
  clearHistory() {
    this._history = [];
  }
  async post(prompt) {
    await this._append("user", prompt);
    let text = await asString(await this._post());
    if (text.startsWith("```json") && text.endsWith("```"))
      text = text.substring("```json".length, text.length - "```".length);
    for (let i = 0; i < 3; ++i) {
      try {
        return JSON.parse(text);
      } catch (e) {
        await this._append("user", String(e));
      }
    }
    throw new Error("Failed to parse response: " + text);
  }
  async _append(user, content) {
    this._history.push({ user, content });
  }
  async _connection() {
    if (!this._connectionPromise) {
      this._connectionPromise = import_transport.WebSocketTransport.connect(void 0, this._wsEndpoint).then((transport) => {
        return new Connection(transport, (method, params) => this._dispatchEvent(method, params), () => {
        });
      });
    }
    return this._connectionPromise;
  }
  _dispatchEvent(method, params) {
    if (method === "chatChunk") {
      const { chatId, chunk } = params;
      const chunkSink = this._chatSinks.get(chatId);
      chunkSink(chunk);
      if (!chunk)
        this._chatSinks.delete(chatId);
    }
  }
  async _post() {
    const connection = await this._connection();
    const result = await connection.send("chat", { history: this._history });
    const { chatId } = result;
    const { iterable, addChunk } = iterablePump();
    this._chatSinks.set(chatId, addChunk);
    return iterable;
  }
}
async function asString(stream) {
  let result = "";
  for await (const chunk of stream)
    result += chunk;
  return result;
}
function iterablePump() {
  let controller;
  const stream = new ReadableStream({ start: (c) => controller = c });
  const iterable = (async function* () {
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      yield value;
    }
  })();
  return {
    iterable,
    addChunk: (chunk) => {
      if (chunk)
        controller.enqueue(chunk);
      else
        controller.close();
    }
  };
}
class Connection {
  constructor(transport, onEvent, onClose) {
    this._lastId = 0;
    this._closed = false;
    this._pending = /* @__PURE__ */ new Map();
    this._transport = transport;
    this._onEvent = onEvent;
    this._onClose = onClose;
    this._transport.onmessage = this._dispatchMessage.bind(this);
    this._transport.onclose = this._close.bind(this);
  }
  send(method, params) {
    const id = this._lastId++;
    const message = { id, method, params };
    this._transport.send(message);
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject });
    });
  }
  _dispatchMessage(message) {
    if (message.id === void 0) {
      this._onEvent(message.method, message.params);
      return;
    }
    const callback = this._pending.get(message.id);
    this._pending.delete(message.id);
    if (!callback)
      return;
    if (message.error) {
      callback.reject(new Error(message.error.message));
      return;
    }
    callback.resolve(message.result);
  }
  _close() {
    this._closed = true;
    this._transport.onmessage = void 0;
    this._transport.onclose = void 0;
    for (const { reject } of this._pending.values())
      reject(new Error("Connection closed"));
    this._onClose();
  }
  isClosed() {
    return this._closed;
  }
  close() {
    if (!this._closed)
      this._transport.close();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Chat,
  asString
});
