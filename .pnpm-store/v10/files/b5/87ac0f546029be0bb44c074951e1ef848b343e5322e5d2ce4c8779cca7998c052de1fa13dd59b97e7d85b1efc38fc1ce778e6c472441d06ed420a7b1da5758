import type { HttpRequest } from "@smithy/protocol-http";
import { HttpResponse } from "@smithy/protocol-http";
import type { Logger, Provider, RequestHandler, RequestHandlerMetadata } from "@smithy/types";
export interface WebSocketFetchHandlerOptions {
    /**
     * The maximum time in milliseconds that the connection phase of a request
     * may take before the connection attempt is abandoned.
     */
    connectionTimeout?: number;
    /**
     * Optional logger.
     */
    logger?: Logger;
}
/**
 * Base handler for websocket requests and HTTP request. By default, the request input and output
 * body will be in a ReadableStream, because of interface consistency among middleware.
 * If ReadableStream is not available, like in React-Native, the response body
 * will be an async iterable.
 */
export declare class WebSocketFetchHandler {
    readonly metadata: RequestHandlerMetadata;
    private config;
    private configPromise;
    private readonly httpHandler;
    private readonly sockets;
    /**
     * @returns the input if it is an HttpHandler of any class,
     * or instantiates a new instance of this handler.
     */
    static create(instanceOrOptions?: WebSocketFetchHandler | WebSocketFetchHandlerOptions | Provider<WebSocketFetchHandlerOptions | void>, httpHandler?: RequestHandler<any, any>): WebSocketFetchHandler;
    constructor(options?: WebSocketFetchHandlerOptions | Provider<WebSocketFetchHandlerOptions>, httpHandler?: RequestHandler<any, any>);
    /**
     * Destroys the WebSocketHandler.
     * Closes all sockets from the socket pool.
     */
    destroy(): void;
    handle(request: HttpRequest): Promise<{
        response: HttpResponse;
    }>;
    updateHttpClientConfig(key: keyof WebSocketFetchHandlerOptions, value: WebSocketFetchHandlerOptions[typeof key]): void;
    httpHandlerConfigs(): WebSocketFetchHandlerOptions;
    /**
     * Removes all closing/closed sockets from the socket pool for URL.
     */
    private removeNotUsableSockets;
    private waitForReady;
    private connect;
}
