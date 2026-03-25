import { DeferredPromise } from '@open-draft/deferred-promise';

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

export { HttpRequestEventMap as H, IS_PATCHED_MODULE as I, RequestController as R, RequestCredentials as a };
