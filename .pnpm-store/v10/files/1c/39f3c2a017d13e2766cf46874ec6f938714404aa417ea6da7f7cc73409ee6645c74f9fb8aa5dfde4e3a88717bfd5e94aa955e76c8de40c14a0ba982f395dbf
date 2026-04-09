import { formatUrl } from "@aws-sdk/util-format-url";
import { iterableToReadableStream, readableStreamtoIterable } from "@smithy/eventstream-serde-browser";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { HttpResponse } from "@smithy/protocol-http";
import { fromBase64 } from "@smithy/util-base64";
import { isWebSocketRequest } from "./utils";
const DEFAULT_WS_CONNECTION_TIMEOUT_MS = 3000;
export class WebSocketFetchHandler {
    metadata = {
        handlerProtocol: "websocket/h1.1",
    };
    config = {};
    configPromise;
    httpHandler;
    sockets = {};
    static create(instanceOrOptions, httpHandler = new FetchHttpHandler()) {
        if (typeof instanceOrOptions?.handle === "function") {
            return instanceOrOptions;
        }
        return new WebSocketFetchHandler(instanceOrOptions, httpHandler);
    }
    constructor(options, httpHandler = new FetchHttpHandler()) {
        this.httpHandler = httpHandler;
        const setConfig = (opts) => {
            this.config = {
                ...(opts ?? {}),
            };
            return this.config;
        };
        if (typeof options === "function") {
            this.config = {};
            this.configPromise = options().then((opts) => {
                return setConfig(opts);
            });
        }
        else {
            this.configPromise = Promise.resolve(setConfig(options));
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
        this.config = await this.configPromise;
        const { logger } = this.config;
        if (!isWebSocketRequest(request)) {
            logger?.debug?.(`@aws-sdk - ws fetching ${request.protocol}${request.hostname}${request.path}`);
            return this.httpHandler.handle(request);
        }
        const url = formatUrl(request);
        logger?.debug?.(`@aws-sdk - ws connecting ${url.split("?")[0]}`);
        const socket = new WebSocket(url);
        if (!this.sockets[url]) {
            this.sockets[url] = [];
        }
        this.sockets[url].push(socket);
        socket.binaryType = "arraybuffer";
        const { connectionTimeout = DEFAULT_WS_CONNECTION_TIMEOUT_MS } = this.config;
        await this.waitForReady(socket, connectionTimeout);
        const { body } = request;
        const bodyStream = getIterator(body);
        const asyncIterable = this.connect(socket, bodyStream);
        const outputPayload = toReadableStream(asyncIterable);
        return {
            response: new HttpResponse({
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
                        websocketSynthetic500Error: true,
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
        const messageQueue = [];
        let pendingResolve = null;
        let pendingReject = null;
        const push = (item) => {
            if (pendingResolve) {
                if (item.error) {
                    pendingReject(item.error);
                }
                else {
                    pendingResolve({ done: item.done, value: item.value });
                }
                pendingResolve = null;
                pendingReject = null;
            }
            else {
                messageQueue.push(item);
            }
        };
        socket.onmessage = (event) => {
            const { data } = event;
            if (typeof data === "string") {
                push({
                    done: false,
                    value: fromBase64(data),
                });
            }
            else {
                push({
                    done: false,
                    value: new Uint8Array(data),
                });
            }
        };
        socket.onerror = (event) => {
            socket.close();
            push({ done: true, error: event });
        };
        socket.onclose = () => {
            this.removeNotUsableSockets(socket.url);
            push({ done: true });
        };
        const outputStream = {
            [Symbol.asyncIterator]: () => ({
                async next() {
                    if (messageQueue.length > 0) {
                        const item = messageQueue.shift();
                        if (item.error) {
                            throw item.error;
                        }
                        return { done: item.done, value: item.value };
                    }
                    return new Promise((resolve, reject) => {
                        pendingResolve = resolve;
                        pendingReject = reject;
                    });
                },
            }),
        };
        const send = async () => {
            try {
                for await (const chunk of data) {
                    if (socket.readyState >= WebSocket.CLOSING) {
                        break;
                    }
                    else {
                        socket.send(chunk);
                    }
                }
            }
            catch (err) {
                push({
                    done: true,
                    error: err,
                });
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
        return readableStreamtoIterable(stream);
    }
    return {
        [Symbol.asyncIterator]: async function* () {
            yield stream;
        },
    };
};
const toReadableStream = (asyncIterable) => typeof ReadableStream === "function" ? iterableToReadableStream(asyncIterable) : asyncIterable;
const isReadableStream = (payload) => typeof ReadableStream === "function" && payload instanceof ReadableStream;
