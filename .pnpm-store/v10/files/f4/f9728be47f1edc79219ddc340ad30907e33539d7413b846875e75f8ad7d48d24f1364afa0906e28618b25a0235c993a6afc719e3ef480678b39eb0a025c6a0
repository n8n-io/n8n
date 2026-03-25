import { DeferredPromise } from '@open-draft/deferred-promise';
import { Logger } from '@open-draft/logger';
import { Emitter, Listener } from 'strict-event-emitter';

declare const kRequestHandled: unique symbol;
declare const kResponsePromise: unique symbol;
declare class RequestController {
    private request;
    /**
     * Internal response promise.
     * Available only for the library internals to grab the
     * response instance provided by the developer.
     * @note This promise cannot be rejected. It's either infinitely
     * pending or resolved with whichever Response was passed to `respondWith()`.
     */
    [kResponsePromise]: DeferredPromise<Response | Error | undefined>;
    /**
     * Internal flag indicating if this request has been handled.
     * @note The response promise becomes "fulfilled" on the next tick.
     */
    [kRequestHandled]: boolean;
    constructor(request: Request);
    /**
     * Respond to this request with the given `Response` instance.
     * @example
     * controller.respondWith(new Response())
     * controller.respondWith(Response.json({ id }))
     * controller.respondWith(Response.error())
     */
    respondWith(response: Response): void;
    /**
     * Error this request with the given error.
     * @example
     * controller.errorWith()
     * controller.errorWith(new Error('Oops!'))
     */
    errorWith(error?: Error): void;
}

declare const IS_PATCHED_MODULE: unique symbol;

type RequestCredentials = 'omit' | 'include' | 'same-origin';
type HttpRequestEventMap = {
    request: [
        args: {
            request: Request;
            requestId: string;
            controller: RequestController;
        }
    ];
    response: [
        args: {
            response: Response;
            isMockedResponse: boolean;
            request: Request;
            requestId: string;
        }
    ];
    unhandledException: [
        args: {
            error: unknown;
            request: Request;
            requestId: string;
            controller: RequestController;
        }
    ];
};

type InterceptorEventMap = Record<string, any>;
type InterceptorSubscription = () => void;
/**
 * Request header name to detect when a single request
 * is being handled by nested interceptors (XHR -> ClientRequest).
 * Obscure by design to prevent collisions with user-defined headers.
 * Ideally, come up with the Interceptor-level mechanism for this.
 * @see https://github.com/mswjs/interceptors/issues/378
 */
declare const INTERNAL_REQUEST_ID_HEADER_NAME = "x-interceptors-internal-request-id";
declare function getGlobalSymbol<V>(symbol: Symbol): V | undefined;
declare function deleteGlobalSymbol(symbol: Symbol): void;
declare enum InterceptorReadyState {
    INACTIVE = "INACTIVE",
    APPLYING = "APPLYING",
    APPLIED = "APPLIED",
    DISPOSING = "DISPOSING",
    DISPOSED = "DISPOSED"
}
type ExtractEventNames<Events extends Record<string, any>> = Events extends Record<infer EventName, any> ? EventName : never;
declare class Interceptor<Events extends InterceptorEventMap> {
    private readonly symbol;
    protected emitter: Emitter<Events>;
    protected subscriptions: Array<InterceptorSubscription>;
    protected logger: Logger;
    readyState: InterceptorReadyState;
    constructor(symbol: symbol);
    /**
     * Determine if this interceptor can be applied
     * in the current environment.
     */
    protected checkEnvironment(): boolean;
    /**
     * Apply this interceptor to the current process.
     * Returns an already running interceptor instance if it's present.
     */
    apply(): void;
    /**
     * Setup the module augments and stubs necessary for this interceptor.
     * This method is not run if there's a running interceptor instance
     * to prevent instantiating an interceptor multiple times.
     */
    protected setup(): void;
    /**
     * Listen to the interceptor's public events.
     */
    on<EventName extends ExtractEventNames<Events>>(event: EventName, listener: Listener<Events[EventName]>): this;
    once<EventName extends ExtractEventNames<Events>>(event: EventName, listener: Listener<Events[EventName]>): this;
    off<EventName extends ExtractEventNames<Events>>(event: EventName, listener: Listener<Events[EventName]>): this;
    removeAllListeners<EventName extends ExtractEventNames<Events>>(event?: EventName): this;
    /**
     * Disposes of any side-effects this interceptor has introduced.
     */
    dispose(): void;
    private getInstance;
    private setInstance;
    private clearInstance;
}

export { ExtractEventNames as E, HttpRequestEventMap as H, IS_PATCHED_MODULE as I, RequestController as R, RequestCredentials as a, InterceptorEventMap as b, InterceptorSubscription as c, INTERNAL_REQUEST_ID_HEADER_NAME as d, deleteGlobalSymbol as e, InterceptorReadyState as f, getGlobalSymbol as g, Interceptor as h };
