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
var websocket_exports = {};
__export(websocket_exports, {
  createBunWebSocket: () => createBunWebSocket,
  createWSContext: () => createWSContext,
  upgradeWebSocket: () => upgradeWebSocket,
  websocket: () => websocket
});
module.exports = __toCommonJS(websocket_exports);
var import_websocket = require("../../helper/websocket");
var import_server = require("./server");
const createWSContext = (ws) => {
  return new import_websocket.WSContext({
    send: (source, options) => {
      ws.send(source, options?.compress);
    },
    raw: ws,
    readyState: ws.readyState,
    url: ws.data.url,
    protocol: ws.data.protocol,
    close(code, reason) {
      ws.close(code, reason);
    }
  });
};
const upgradeWebSocket = (0, import_websocket.defineWebSocketHelper)((c, events) => {
  const server = (0, import_server.getBunServer)(c);
  if (!server) {
    throw new TypeError("env has to include the 2nd argument of fetch.");
  }
  const upgradeResult = server.upgrade(c.req.raw, {
    data: {
      events,
      url: new URL(c.req.url),
      protocol: c.req.url
    }
  });
  if (upgradeResult) {
    return new Response(null);
  }
  return;
});
const websocket = {
  open(ws) {
    const websocketListeners = ws.data.events;
    if (websocketListeners.onOpen) {
      websocketListeners.onOpen(new Event("open"), createWSContext(ws));
    }
  },
  close(ws, code, reason) {
    const websocketListeners = ws.data.events;
    if (websocketListeners.onClose) {
      websocketListeners.onClose(
        new CloseEvent("close", {
          code,
          reason
        }),
        createWSContext(ws)
      );
    }
  },
  message(ws, message) {
    const websocketListeners = ws.data.events;
    if (websocketListeners.onMessage) {
      const normalizedReceiveData = typeof message === "string" ? message : message.buffer;
      websocketListeners.onMessage((0, import_websocket.createWSMessageEvent)(normalizedReceiveData), createWSContext(ws));
    }
  }
};
const createBunWebSocket = () => ({
  upgradeWebSocket,
  websocket
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBunWebSocket,
  createWSContext,
  upgradeWebSocket,
  websocket
});
