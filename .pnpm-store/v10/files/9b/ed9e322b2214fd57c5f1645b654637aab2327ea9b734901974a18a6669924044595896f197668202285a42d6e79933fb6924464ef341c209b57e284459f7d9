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
  upgradeWebSocket: () => upgradeWebSocket
});
module.exports = __toCommonJS(websocket_exports);
var import_websocket = require("../../helper/websocket");
const upgradeWebSocket = (0, import_websocket.defineWebSocketHelper)(async (c, events, options) => {
  if (c.req.header("upgrade") !== "websocket") {
    return;
  }
  const { response, socket } = Deno.upgradeWebSocket(c.req.raw, options ?? {});
  const wsContext = new import_websocket.WSContext({
    close: (code, reason) => socket.close(code, reason),
    get protocol() {
      return socket.protocol;
    },
    raw: socket,
    get readyState() {
      return socket.readyState;
    },
    url: socket.url ? new URL(socket.url) : null,
    send: (source) => socket.send(source)
  });
  socket.onopen = (evt) => events.onOpen?.(evt, wsContext);
  socket.onmessage = (evt) => events.onMessage?.(evt, wsContext);
  socket.onclose = (evt) => events.onClose?.(evt, wsContext);
  socket.onerror = (evt) => events.onError?.(evt, wsContext);
  return response;
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  upgradeWebSocket
});
