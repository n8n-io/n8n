import type { Agent as hAgent, AgentOptions as hAgentOptions } from "http";
import type { Agent as hsAgent, AgentOptions as hsAgentOptions } from "https";
import type { HttpRequest as IHttpRequest } from "../http";
import type { Logger } from "../logger";
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
     * Defaults to 0, which disables the timeout.
     */
    connectionTimeout?: number;
    /**
     * The maximum number of milliseconds request & response should take.
     * Defaults to 0, which disables the timeout.
     *
     * If exceeded, a warning will be emitted unless throwOnRequestTimeout=true,
     * in which case a TimeoutError will be thrown.
     */
    requestTimeout?: number;
    /**
     * Because requestTimeout was for a long time incorrectly being set as a socket idle timeout,
     * users must also opt-in for request timeout thrown errors.
     * Without this setting, a breach of the request timeout will be logged as a warning.
     */
    throwOnRequestTimeout?: boolean;
    /**
     * The maximum time in milliseconds that a socket may remain idle before it
     * is closed. Defaults to 0, which means no maximum.
     *
     * This does not affect the server, which may still close the connection due to an idle socket.
     */
    socketTimeout?: number;
    /**
     * Delay before the NodeHttpHandler checks for socket exhaustion,
     * and emits a warning if the active sockets and enqueued request count is greater than
     * 2x the maxSockets count.
     *
     * Defaults to connectionTimeout + requestTimeout or 3000ms if those are not set.
     */
    socketAcquisitionWarningTimeout?: number;
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
