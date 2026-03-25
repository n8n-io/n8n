import { EventEmitter } from 'node:events';
import { IncomingMessage, RequestOptions } from 'node:http';
import { Client, Integration, Scope } from '@sentry/core';
interface WeakRefImpl<T> {
    deref(): T | undefined;
}
type StartSpanCallback = (next: () => boolean) => boolean;
type RequestWithOptionalStartSpanCallback = IncomingMessage & {
    _startSpanCallback?: WeakRefImpl<StartSpanCallback>;
};
export interface HttpServerIntegrationOptions {
    /**
     * Whether the integration should create [Sessions](https://docs.sentry.io/product/releases/health/#sessions) for incoming requests to track the health and crash-free rate of your releases in Sentry.
     * Read more about Release Health: https://docs.sentry.io/product/releases/health/
     *
     * Defaults to `true`.
     */
    sessions?: boolean;
    /**
     * Number of milliseconds until sessions tracked with `trackIncomingRequestsAsSessions` will be flushed as a session aggregate.
     *
     * Defaults to `60000` (60s).
     */
    sessionFlushingDelayMS?: number;
    /**
     * Do not capture the request body for incoming HTTP requests to URLs where the given callback returns `true`.
     * This can be useful for long running requests where the body is not needed and we want to avoid capturing it.
     *
     * @param url Contains the entire URL, including query string (if any), protocol, host, etc. of the incoming request.
     * @param request Contains the {@type RequestOptions} object used to make the incoming request.
     */
    ignoreRequestBody?: (url: string, request: RequestOptions) => boolean;
    /**
     * Controls the maximum size of incoming HTTP request bodies attached to events.
     *
     * Available options:
     * - 'none': No request bodies will be attached
     * - 'small': Request bodies up to 1,000 bytes will be attached
     * - 'medium': Request bodies up to 10,000 bytes will be attached (default)
     * - 'always': Request bodies will always be attached
     *
     * Note that even with 'always' setting, bodies exceeding 1MB will never be attached
     * for performance and security reasons.
     *
     * @default 'medium'
     */
    maxRequestBodySize?: 'none' | 'small' | 'medium' | 'always';
}
/**
 * Add a callback to the request object that will be called when the request is started.
 * The callback will receive the next function to continue processing the request.
 */
export declare function addStartSpanCallback(request: RequestWithOptionalStartSpanCallback, callback: StartSpanCallback): void;
/**
 * This integration handles request isolation, trace continuation and other core Sentry functionality around incoming http requests
 * handled via the node `http` module.
 */
export declare const httpServerIntegration: (options?: HttpServerIntegrationOptions) => Integration & {
    name: "HttpServer";
    setupOnce: () => void;
};
/**
 * Starts a session and tracks it in the context of a given isolation scope.
 * When the passed response is finished, the session is put into a task and is
 * aggregated with other sessions that may happen in a certain time window
 * (sessionFlushingDelayMs).
 *
 * The sessions are always aggregated by the client that is on the current scope
 * at the time of ending the response (if there is one).
 */
export declare function recordRequestSession(client: Client, { requestIsolationScope, response, sessionFlushingDelayMS, }: {
    requestIsolationScope: Scope;
    response: EventEmitter;
    sessionFlushingDelayMS?: number;
}): void;
export {};
//# sourceMappingURL=httpServerIntegration.d.ts.map
