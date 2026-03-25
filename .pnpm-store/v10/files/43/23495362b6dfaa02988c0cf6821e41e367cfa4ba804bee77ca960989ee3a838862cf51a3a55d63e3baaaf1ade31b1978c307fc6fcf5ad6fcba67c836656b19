import { eventStreamHandlingMiddleware, eventStreamHandlingMiddlewareOptions } from "./eventStreamHandlingMiddleware";
import { eventStreamHeaderMiddleware, eventStreamHeaderMiddlewareOptions } from "./eventStreamHeaderMiddleware";
export const getEventStreamPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(eventStreamHandlingMiddleware(options), eventStreamHandlingMiddlewareOptions);
        clientStack.add(eventStreamHeaderMiddleware, eventStreamHeaderMiddlewareOptions);
    },
});
