import { injectSessionIdMiddleware, injectSessionIdMiddlewareOptions } from "./middleware-session-id";
import { websocketEndpointMiddleware, websocketEndpointMiddlewareOptions } from "./middleware-websocket-endpoint";
export const getWebSocketPlugin = (config, options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(websocketEndpointMiddleware(config, options), websocketEndpointMiddlewareOptions);
        clientStack.add(injectSessionIdMiddleware(), injectSessionIdMiddlewareOptions);
    },
});
