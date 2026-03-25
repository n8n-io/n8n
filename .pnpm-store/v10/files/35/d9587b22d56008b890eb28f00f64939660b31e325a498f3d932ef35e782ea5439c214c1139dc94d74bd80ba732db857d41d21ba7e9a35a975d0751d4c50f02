import { HttpRequest } from "@smithy/protocol-http";
export const websocketEndpointMiddleware = (config, options) => (next) => (args) => {
    const { request } = args;
    if (HttpRequest.isInstance(request) &&
        config.requestHandler.metadata?.handlerProtocol?.toLowerCase().includes("websocket")) {
        request.protocol = "wss:";
        request.method = "GET";
        request.path = `${request.path}-websocket`;
        const { headers } = request;
        delete headers["content-type"];
        delete headers["x-amz-content-sha256"];
        for (const name of Object.keys(headers)) {
            if (name.indexOf(options.headerPrefix) === 0) {
                const chunkedName = name.replace(options.headerPrefix, "");
                request.query[chunkedName] = headers[name];
            }
        }
        if (headers["x-amz-user-agent"]) {
            request.query["user-agent"] = headers["x-amz-user-agent"];
        }
        request.headers = { host: headers.host ?? request.hostname };
    }
    return next(args);
};
export const websocketEndpointMiddlewareOptions = {
    name: "websocketEndpointMiddleware",
    tags: ["WEBSOCKET", "EVENT_STREAM"],
    relation: "after",
    toMiddleware: "eventStreamHeaderMiddleware",
    override: true,
};
