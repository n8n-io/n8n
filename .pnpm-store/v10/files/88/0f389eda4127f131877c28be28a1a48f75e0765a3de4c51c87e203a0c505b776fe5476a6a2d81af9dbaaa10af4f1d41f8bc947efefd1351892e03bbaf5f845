// src/adapter/bun/websocket.ts
import { createWSMessageEvent, defineWebSocketHelper, WSContext } from "../../helper/websocket/index.js";
import { getBunServer } from "./server.js";
var createWSContext = (ws) => {
  return new WSContext({
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
var upgradeWebSocket = defineWebSocketHelper((c, events) => {
  const server = getBunServer(c);
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
var websocket = {
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
      websocketListeners.onMessage(createWSMessageEvent(normalizedReceiveData), createWSContext(ws));
    }
  }
};
var createBunWebSocket = () => ({
  upgradeWebSocket,
  websocket
});
export {
  createBunWebSocket,
  createWSContext,
  upgradeWebSocket,
  websocket
};
