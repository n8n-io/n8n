import { AjaxRequest } from './types';
/**
 * A normalized AJAX error.
 *
 * @see {@link ajax}
 */
export interface AjaxError extends Error {
    /**
     * The XHR instance associated with the error.
     */
    xhr: XMLHttpRequest;
    /**
     * The AjaxRequest associated with the error.
     */
    request: AjaxRequest;
    /**
     * The HTTP status code, if the request has completed. If not,
     * it is set to `0`.
     */
    status: number;
    /**
     * The responseType (e.g. 'json', 'arraybuffer', or 'xml').
     */
    responseType: XMLHttpRequestResponseType;
    /**
     * The response data.
     */
    response: any;
}
export interface AjaxErrorCtor {
    /**
     * @deprecated Internal implementation detail. Do not construct error instances.
     * Cannot be tagged as internal: https://github.com/ReactiveX/rxjs/issues/6269
     */
    new (message: string, xhr: XMLHttpRequest, request: AjaxRequest): AjaxError;
}
/**
 * Thrown when an error occurs during an AJAX request.
 * This is only exported because it is useful for checking to see if an error
 * is an `instanceof AjaxError`. DO NOT create new instances of `AjaxError` with
 * the constructor.
 *
 * @see {@link ajax}
 */
export declare const AjaxError: AjaxErrorCtor;
export interface AjaxTimeoutError extends AjaxError {
}
export interface AjaxTimeoutErrorCtor {
    /**
     * @deprecated Internal implementation detail. Do not construct error instances.
     * Cannot be tagged as internal: https://github.com/ReactiveX/rxjs/issues/6269
     */
    new (xhr: XMLHttpRequest, request: AjaxRequest): AjaxTimeoutError;
}
/**
 * Thrown when an AJAX request times out. Not to be confused with {@link TimeoutError}.
 *
 * This is exported only because it is useful for checking to see if errors are an
 * `instanceof AjaxTimeoutError`. DO NOT use the constructor to create an instance of
 * this type.
 *
 * @see {@link ajax}
 */
export declare const AjaxTimeoutError: AjaxTimeoutErrorCtor;
//# sourceMappingURL=errors.d.ts.map