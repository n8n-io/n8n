import { HttpRequest } from "@smithy/protocol-http";
export const eventStreamHandlingMiddleware = (options) => (next, context) => async (args) => {
    const { request } = args;
    if (!HttpRequest.isInstance(request))
        return next(args);
    return options.eventStreamPayloadHandler.handle(next, args, context);
};
export const eventStreamHandlingMiddlewareOptions = {
    tags: ["EVENT_STREAM", "SIGNATURE", "HANDLE"],
    name: "eventStreamHandlingMiddleware",
    relation: "after",
    toMiddleware: "awsAuthMiddleware",
    override: true,
};
