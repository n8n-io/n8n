'use strict';

var protocolHttp = require('@smithy/protocol-http');

function resolveEventStreamConfig(input) {
    const eventSigner = input.signer;
    const messageSigner = input.signer;
    const newInput = Object.assign(input, {
        eventSigner,
        messageSigner,
    });
    const eventStreamPayloadHandler = newInput.eventStreamPayloadHandlerProvider(newInput);
    return Object.assign(newInput, {
        eventStreamPayloadHandler,
    });
}

const eventStreamHandlingMiddleware = (options) => (next, context) => async (args) => {
    const { request } = args;
    if (!protocolHttp.HttpRequest.isInstance(request))
        return next(args);
    return options.eventStreamPayloadHandler.handle(next, args, context);
};
const eventStreamHandlingMiddlewareOptions = {
    tags: ["EVENT_STREAM", "SIGNATURE", "HANDLE"],
    name: "eventStreamHandlingMiddleware",
    relation: "after",
    toMiddleware: "awsAuthMiddleware",
    override: true,
};

const eventStreamHeaderMiddleware = (next) => async (args) => {
    const { request } = args;
    if (!protocolHttp.HttpRequest.isInstance(request))
        return next(args);
    request.headers = {
        ...request.headers,
        "content-type": "application/vnd.amazon.eventstream",
        "x-amz-content-sha256": "STREAMING-AWS4-HMAC-SHA256-EVENTS",
    };
    return next({
        ...args,
        request,
    });
};
const eventStreamHeaderMiddlewareOptions = {
    step: "build",
    tags: ["EVENT_STREAM", "HEADER", "CONTENT_TYPE", "CONTENT_SHA256"],
    name: "eventStreamHeaderMiddleware",
    override: true,
};

const getEventStreamPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(eventStreamHandlingMiddleware(options), eventStreamHandlingMiddlewareOptions);
        clientStack.add(eventStreamHeaderMiddleware, eventStreamHeaderMiddlewareOptions);
    },
});

exports.eventStreamHandlingMiddleware = eventStreamHandlingMiddleware;
exports.eventStreamHandlingMiddlewareOptions = eventStreamHandlingMiddlewareOptions;
exports.eventStreamHeaderMiddleware = eventStreamHeaderMiddleware;
exports.eventStreamHeaderMiddlewareOptions = eventStreamHeaderMiddlewareOptions;
exports.getEventStreamPlugin = getEventStreamPlugin;
exports.resolveEventStreamConfig = resolveEventStreamConfig;
