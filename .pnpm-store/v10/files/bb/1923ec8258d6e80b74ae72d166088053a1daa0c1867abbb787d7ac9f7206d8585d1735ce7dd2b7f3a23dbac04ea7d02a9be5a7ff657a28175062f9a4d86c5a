// src/adapter/deno/websocket.ts
import { WSContext, defineWebSocketHelper } from "../../helper/websocket/index.js";
var upgradeWebSocket = defineWebSocketHelper(async (c, events, options) => {
  if (c.req.header("upgrade") !== "websocket") {
    return;
  }
  const { response, socket } = Deno.upgradeWebSocket(c.req.raw, options ?? {});
  const wsContext = new WSContext({
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
export {
  upgradeWebSocket
};
