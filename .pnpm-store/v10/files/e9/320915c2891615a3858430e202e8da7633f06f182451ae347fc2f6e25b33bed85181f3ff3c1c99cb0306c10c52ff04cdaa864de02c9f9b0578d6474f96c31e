import { websocketEndpointMiddleware, websocketEndpointMiddlewareOptions, } from "./middlewares/websocketEndpointMiddleware";
import { injectSessionIdMiddleware, injectSessionIdMiddlewareOptions, } from "./middlewares/websocketInjectSessionIdMiddleware";
export const getWebSocketPlugin = (config, options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(websocketEndpointMiddleware(config, options), websocketEndpointMiddlewareOptions);
        clientStack.add(injectSessionIdMiddleware(), injectSessionIdMiddlewareOptions);
    },
});
