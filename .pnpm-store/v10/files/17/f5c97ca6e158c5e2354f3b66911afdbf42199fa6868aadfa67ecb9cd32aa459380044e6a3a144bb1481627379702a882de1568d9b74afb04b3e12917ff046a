import { AjaxRequest } from './types';
import { getXHRResponse } from './getXHRResponse';
import { createErrorClass } from '../util/createErrorClass';

/**
 * A normalized AJAX error.
 *
 * @see {@link ajax}
 *
 * @class AjaxError
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
 * @class AjaxError
 * @see {@link ajax}
 */
export const AjaxError: AjaxErrorCtor = createErrorClass(
  (_super) =>
    function AjaxErrorImpl(this: any, message: string, xhr: XMLHttpRequest, request: AjaxRequest) {
      this.message = message;
      this.name = 'AjaxError';
      this.xhr = xhr;
      this.request = request;
      this.status = xhr.status;
      this.responseType = xhr.responseType;
      let response: any;
      try {
        // This can throw in IE, because we have to do a JSON.parse of
        // the response in some cases to get the expected response property.
        response = getXHRResponse(xhr);
      } catch (err) {
        response = xhr.responseText;
      }
      this.response = response;
    }
);

export interface AjaxTimeoutError extends AjaxError {}

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
 * @class AjaxTimeoutError
 * @see {@link ajax}
 */
export const AjaxTimeoutError: AjaxTimeoutErrorCtor = (() => {
  function AjaxTimeoutErrorImpl(this: any, xhr: XMLHttpRequest, request: AjaxRequest) {
    AjaxError.call(this, 'ajax timeout', xhr, request);
    this.name = 'AjaxTimeoutError';
    return this;
  }
  AjaxTimeoutErrorImpl.prototype = Object.create(AjaxError.prototype);
  return AjaxTimeoutErrorImpl;
})() as any;
