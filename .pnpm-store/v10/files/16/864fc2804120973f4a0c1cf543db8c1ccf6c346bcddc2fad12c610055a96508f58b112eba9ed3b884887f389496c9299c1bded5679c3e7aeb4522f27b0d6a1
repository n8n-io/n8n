import { formatUrl } from "@aws-sdk/util-format-url";
import { iterableToReadableStream, readableStreamtoIterable } from "@smithy/eventstream-serde-browser";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { HttpResponse } from "@smithy/protocol-http";
import { isWebSocketRequest } from "./utils";
const DEFAULT_WS_CONNECTION_TIMEOUT_MS = 2000;
export class WebSocketFetchHandler {
    metadata = {
        handlerProtocol: "websocket/h1.1",
    };
    config;
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
        const url = formatUrl(request);
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
