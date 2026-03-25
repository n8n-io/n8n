/// <reference types="node" />
import { Agent as hAgent, AgentOptions as hAgentOptions } from "http";
import { Agent as hsAgent, AgentOptions as hsAgentOptions } from "https";
import { HttpRequest as IHttpRequest } from "../http";
import { Logger } from "../logger";
/**
 *
 * This type represents an alternate client constructor option for the entry
 * "requestHandler". Instead of providing an instance of a requestHandler, the user
 * may provide the requestHandler's constructor options for either the
 * NodeHttpHandler or FetchHttpHandler.
 *
 * For other RequestHandlers like HTTP2 or WebSocket,
 * constructor parameter passthrough is not currently available.
 *
 * @public
 */
export type RequestHandlerParams = NodeHttpHandlerOptions | FetchHttpHandlerOptions;
/**
 * Represents the http options that can be passed to a node http client.
 * @public
 */
export interface NodeHttpHandlerOptions {
    /**
     * The maximum time in milliseconds that the connection phase of a request
     * may take before the connection attempt is abandoned.
     *
     * Defaults to 0, which disables the timeout.
     */
    connectionTimeout?: number;
    /**
     * The number of milliseconds a request can take before automatically being terminated.
     * Defaults to 0, which disables the timeout.
     */
    requestTimeout?: number;
    /**
     * Delay before the NodeHttpHandler checks for socket exhaustion,
     * and emits a warning if the active sockets and enqueued request count is greater than
     * 2x the maxSockets count.
     *
     * Defaults to connectionTimeout + requestTimeout or 3000ms if those are not set.
     */
    socketAcquisitionWarningTimeout?: number;
    /**
     * This field is deprecated, and requestTimeout should be used instead.
     * The maximum time in milliseconds that a socket may remain idle before it
     * is closed.
     *
     * @deprecated Use {@link requestTimeout}
     */
    socketTimeout?: number;
    /**
     * You can pass http.Agent or its constructor options.
     */
    httpAgent?: hAgent | hAgentOptions;
    /**
     * You can pass https.Agent or its constructor options.
     */
    httpsAgent?: hsAgent | hsAgentOptions;
    /**
     * Optional logger.
     */
    logger?: Logger;
}
/**
 * Represents the http options that can be passed to a browser http client.
 * @public
 */
export interface FetchHttpHandlerOptions {
    /**
     * The number of milliseconds a request can take before being automatically
     * terminated.
     */
    requestTimeout?: number;
    /**
     * Whether to allow the request to outlive the page. Default value is false.
     *
     * There may be limitations to the payload size, number of concurrent requests,
     * request duration etc. when using keepalive in browsers.
     *
     * These may change over time, so look for up to date information about
     * these limitations before enabling keepalive.
     */
    keepAlive?: boolean;
    /**
     * A string indicating whether credentials will be sent with the request always, never, or
     * only when sent to a same-origin URL.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
     */
    credentials?: "include" | "omit" | "same-origin" | undefined | string;
    /**
     * Cache settings for fetch.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
     */
    cache?: "default" | "force-cache" | "no-cache" | "no-store" | "only-if-cached" | "reload";
    /**
     * An optional function that produces additional RequestInit
     * parameters for each httpRequest.
     *
     * This is applied last via merging with Object.assign() and overwrites other values
     * set from other sources.
     *
     * @example
     * ```js
     * new Client({
     *   requestHandler: {
     *     requestInit(httpRequest) {
     *       return { cache: "no-store" };
     *     }
     *   }
     * });
     * ```
     */
    requestInit?: (httpRequest: IHttpRequest) => RequestInit;
}
declare global {
    /**
     * interface merging stub.
     */
    interface RequestInit {
    }
}
