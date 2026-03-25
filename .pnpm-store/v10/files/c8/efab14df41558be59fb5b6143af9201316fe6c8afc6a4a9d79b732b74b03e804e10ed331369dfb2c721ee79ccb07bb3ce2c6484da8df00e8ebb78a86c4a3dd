'use strict';

var eventstreamCodec = require('@smithy/eventstream-codec');
var utilHexEncoding = require('@smithy/util-hex-encoding');
var protocolHttp = require('@smithy/protocol-http');
var utilFormatUrl = require('@aws-sdk/util-format-url');
var eventstreamSerdeBrowser = require('@smithy/eventstream-serde-browser');
var fetchHttpHandler = require('@smithy/fetch-http-handler');

const getEventSigningTransformStream = (initialSignature, messageSigner, eventStreamCodec, systemClockOffsetProvider) => {
    let priorSignature = initialSignature;
    const transformer = {
        start() { },
        async transform(chunk, controller) {
            try {
                const now = new Date(Date.now() + (await systemClockOffsetProvider()));
                const dateHeader = {
                    ":date": { type: "timestamp", value: now },
                };
                const signedMessage = await messageSigner.sign({
                    message: {
                        body: chunk,
                        headers: dateHeader,
                    },
                    priorSignature: priorSignature,
                }, {
                    signingDate: now,
                });
                priorSignature = signedMessage.signature;
                const serializedSigned = eventStreamCodec.encode({
                    headers: {
                        ...dateHeader,
                        ":chunk-signature": {
                            type: "binary",
                            value: utilHexEncoding.fromHex(signedMessage.signature),
                        },
                    },
                    body: chunk,
                });
                controller.enqueue(serializedSigned);
            }
            catch (error) {
                controller.error(error);
            }
        },
    };
    return new TransformStream({ ...transformer });
};

class EventStreamPayloadHandler {
    messageSigner;
    eventStreamCodec;
    systemClockOffsetProvider;
    constructor(options) {
        this.messageSigner = options.messageSigner;
        this.eventStreamCodec = new eventstreamCodec.EventStreamCodec(options.utf8Encoder, options.utf8Decoder);
        this.systemClockOffsetProvider = async () => options.systemClockOffset ?? 0;
    }
    async handle(next, args, context = {}) {
        const request = args.request;
        const { body: payload, headers, query } = request;
        if (!(payload instanceof ReadableStream)) {
            throw new Error("Eventstream payload must be a ReadableStream.");
        }
        const placeHolderStream = new TransformStream();
        request.body = placeHolderStream.readable;
        let result;
        try {
            result = await next(args);
        }
        catch (e) {
            request.body.cancel();
            throw e;
        }
        const match = (headers["authorization"] || "").match(/Signature=([\w]+)$/);
        const priorSignature = (match || [])[1] || (query && query["X-Amz-Signature"]) || "";
        const signingStream = getEventSigningTransformStream(priorSignature, await this.messageSigner(), this.eventStreamCodec, this.systemClockOffsetProvider);
        const signedPayload = payload.pipeThrough(signingStream);
        signedPayload.pipeThrough(placeHolderStream);
        return result;
    }
}

const eventStreamPayloadHandlerProvider = (options) => new EventStreamPayloadHandler(options);

const injectSessionIdMiddleware = () => (next) => async (args) => {
    const requestParams = {
        ...args.input,
    };
    const response = await next(args);
    const output = response.output;
    if (requestParams.SessionId && output.SessionId == null) {
        output.SessionId = requestParams.SessionId;
    }
    return response;
};
const injectSessionIdMiddlewareOptions = {
    step: "initialize",
    name: "injectSessionIdMiddleware",
    tags: ["WEBSOCKET", "EVENT_STREAM"],
    override: true,
};

const websocketEndpointMiddleware = (config, options) => (next) => (args) => {
    const { request } = args;
    if (protocolHttp.HttpRequest.isInstance(request) &&
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
const websocketEndpointMiddlewareOptions = {
    name: "websocketEndpointMiddleware",
    tags: ["WEBSOCKET", "EVENT_STREAM"],
    relation: "after",
    toMiddleware: "eventStreamHeaderMiddleware",
    override: true,
};

const getWebSocketPlugin = (config, options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(websocketEndpointMiddleware(config, options), websocketEndpointMiddlewareOptions);
        clientStack.add(injectSessionIdMiddleware(), injectSessionIdMiddlewareOptions);
    },
});

const isWebSocketRequest = (request) => request.protocol === "ws:" || request.protocol === "wss:";

class WebsocketSignatureV4 {
    signer;
    constructor(options) {
        this.signer = options.signer;
    }
    presign(originalRequest, options = {}) {
        return this.signer.presign(originalRequest, options);
    }
    async sign(toSign, options) {
        if (protocolHttp.HttpRequest.isInstance(toSign) && isWebSocketRequest(toSign)) {
            const signedRequest = await this.signer.presign({ ...toSign, body: "" }, {
                ...options,
                expiresIn: 60,
                unsignableHeaders: new Set(Object.keys(toSign.headers).filter((header) => header !== "host")),
            });
            return {
                ...signedRequest,
                body: toSign.body,
            };
        }
        else {
            return this.signer.sign(toSign, options);
        }
    }
}

const resolveWebSocketConfig = (input) => {
    const { signer } = input;
    return Object.assign(input, {
        signer: async (authScheme) => {
            const signerObj = await signer(authScheme);
            if (validateSigner(signerObj)) {
                return new WebsocketSignatureV4({ signer: signerObj });
            }
            throw new Error("Expected WebsocketSignatureV4 signer, please check the client constructor.");
        },
    });
};
const validateSigner = (signer) => !!signer;

const DEFAULT_WS_CONNECTION_TIMEOUT_MS = 2000;
class WebSocketFetchHandler {
    metadata = {
        handlerProtocol: "websocket/h1.1",
    };
    config;
    configPromise;
    httpHandler;
    sockets = {};
    static create(instanceOrOptions, httpHandler = new fetchHttpHandler.FetchHttpHandler()) {
        if (typeof instanceOrOptions?.handle === "function") {
            return instanceOrOptions;
        }
        return new WebSocketFetchHandler(instanceOrOptions, httpHandler);
    }
    constructor(options, httpHandler = new fetchHttpHandler.FetchHttpHandler()) {
        this.httpHandler = httpHandler;
        if (typeof options === "function") {
            this.config = {};
            this.configPromise = options().then((opts) => (this.config = opts ?? {}));
        }
        else {
            this.config = options ?? {};
            this.configPromise = Promise.resolve(this.config);
        }
    }
    destroy() {
        for (const [key, sockets] of Object.entries(this.sockets)) {
            for (const socket of sockets) {
                socket.close(1000, `Socket closed through destroy() call`);
            }
            delete this.sockets[key];
        }
    }
    async handle(request) {
        if (!isWebSocketRequest(request)) {
            return this.httpHandler.handle(request);
        }
        const url = utilFormatUrl.formatUrl(request);
        const socket = new WebSocket(url);
        if (!this.sockets[url]) {
            this.sockets[url] = [];
        }
        this.sockets[url].push(socket);
        socket.binaryType = "arraybuffer";
        this.config = await this.configPromise;
        const { connectionTimeout = DEFAULT_WS_CONNECTION_TIMEOUT_MS } = this.config;
        await this.waitForReady(socket, connectionTimeout);
        const { body } = request;
        const bodyStream = getIterator(body);
        const asyncIterable = this.connect(socket, bodyStream);
        const outputPayload = toReadableStream(asyncIterable);
        return {
            response: new protocolHttp.HttpResponse({
                statusCode: 200,
                body: outputPayload,
            }),
        };
    }
    updateHttpClientConfig(key, value) {
        this.configPromise = this.configPromise.then((config) => {
            config[key] = value;
            return config;
        });
    }
    httpHandlerConfigs() {
        return this.config ?? {};
    }
    removeNotUsableSockets(url) {
        this.sockets[url] = (this.sockets[url] ?? []).filter((socket) => ![WebSocket.CLOSING, WebSocket.CLOSED].includes(socket.readyState));
    }
    waitForReady(socket, connectionTimeout) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.removeNotUsableSockets(socket.url);
                reject({
                    $metadata: {
                        httpStatusCode: 500,
                    },
                });
            }, connectionTimeout);
            socket.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };
        });
    }
    connect(socket, data) {
        let streamError = undefined;
        let socketErrorOccurred = false;
        let reject = () => { };
        let resolve = () => { };
        socket.onmessage = (event) => {
            resolve({
                done: false,
                value: new Uint8Array(event.data),
            });
        };
        socket.onerror = (error) => {
            socketErrorOccurred = true;
            socket.close();
            reject(error);
        };
        socket.onclose = () => {
            this.removeNotUsableSockets(socket.url);
            if (socketErrorOccurred)
                return;
            if (streamError) {
                reject(streamError);
            }
            else {
                resolve({
                    done: true,
                    value: undefined,
                });
            }
        };
        const outputStream = {
            [Symbol.asyncIterator]: () => ({
                next: () => {
                    return new Promise((_resolve, _reject) => {
                        resolve = _resolve;
                        reject = _reject;
                    });
                },
            }),
        };
        const send = async () => {
            try {
                for await (const inputChunk of data) {
                    socket.send(inputChunk);
                }
            }
            catch (err) {
                streamError = err;
            }
            finally {
                socket.close(1000);
            }
        };
        send();
        return outputStream;
    }
}
const getIterator = (stream) => {
    if (stream[Symbol.asyncIterator]) {
        return stream;
    }
    if (isReadableStream(stream)) {
        return eventstreamSerdeBrowser.readableStreamtoIterable(stream);
    }
    return {
        [Symbol.asyncIterator]: async function* () {
            yield stream;
        },
    };
};
const toReadableStream = (asyncIterable) => typeof ReadableStream === "function" ? eventstreamSerdeBrowser.iterableToReadableStream(asyncIterable) : asyncIterable;
const isReadableStream = (payload) => typeof ReadableStream === "function" && payload instanceof ReadableStream;

exports.WebSocketFetchHandler = WebSocketFetchHandler;
exports.eventStreamPayloadHandlerProvider = eventStreamPayloadHandlerProvider;
exports.getWebSocketPlugin = getWebSocketPlugin;
exports.resolveWebSocketConfig = resolveWebSocketConfig;
