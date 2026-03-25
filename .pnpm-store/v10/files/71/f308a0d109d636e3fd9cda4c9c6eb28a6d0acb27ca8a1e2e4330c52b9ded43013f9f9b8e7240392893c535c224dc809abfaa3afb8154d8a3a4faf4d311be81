import { map } from '../operators/map';
import { Observable } from '../Observable';
import { AjaxConfig, AjaxRequest, AjaxDirection, ProgressEventType } from './types';
import { AjaxResponse } from './AjaxResponse';
import { AjaxTimeoutError, AjaxError } from './errors';

export interface AjaxCreationMethod {
  /**
   * Creates an observable that will perform an AJAX request using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope by default.
   *
   * This is the most configurable option, and the basis for all other AJAX calls in the library.
   *
   * ## Example
   *
   * ```ts
   * import { ajax } from 'rxjs/ajax';
   * import { map, catchError, of } from 'rxjs';
   *
   * const obs$ = ajax({
   *   method: 'GET',
   *   url: 'https://api.github.com/users?per_page=5',
   *   responseType: 'json'
   * }).pipe(
   *   map(userResponse => console.log('users: ', userResponse)),
   *   catchError(error => {
   *     console.log('error: ', error);
   *     return of(error);
   *   })
   * );
   * ```
   */
  <T>(config: AjaxConfig): Observable<AjaxResponse<T>>;

  /**
   * Perform an HTTP GET using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope. Defaults to a `responseType` of `"json"`.
   *
   * ## Example
   *
   * ```ts
   * import { ajax } from 'rxjs/ajax';
   * import { map, catchError, of } from 'rxjs';
   *
   * const obs$ = ajax('https://api.github.com/users?per_page=5').pipe(
   *   map(userResponse => console.log('users: ', userResponse)),
   *   catchError(error => {
   *     console.log('error: ', error);
   *     return of(error);
   *   })
   * );
   * ```
   */
  <T>(url: string): Observable<AjaxResponse<T>>;

  /**
   * Performs an HTTP GET using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope by default, and a `responseType` of `"json"`.
   *
   * @param url The URL to get the resource from
   * @param headers Optional headers. Case-Insensitive.
   */
  get<T>(url: string, headers?: Record<string, string>): Observable<AjaxResponse<T>>;

  /**
   * Performs an HTTP POST using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope by default, and a `responseType` of `"json"`.
   *
   * Before sending the value passed to the `body` argument, it is automatically serialized
   * based on the specified `responseType`. By default, a JavaScript object will be serialized
   * to JSON. A `responseType` of `application/x-www-form-urlencoded` will flatten any provided
   * dictionary object to a url-encoded string.
   *
   * @param url The URL to get the resource from
   * @param body The content to send. The body is automatically serialized.
   * @param headers Optional headers. Case-Insensitive.
   */
  post<T>(url: string, body?: any, headers?: Record<string, string>): Observable<AjaxResponse<T>>;

  /**
   * Performs an HTTP PUT using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope by default, and a `responseType` of `"json"`.
   *
   * Before sending the value passed to the `body` argument, it is automatically serialized
   * based on the specified `responseType`. By default, a JavaScript object will be serialized
   * to JSON. A `responseType` of `application/x-www-form-urlencoded` will flatten any provided
   * dictionary object to a url-encoded string.
   *
   * @param url The URL to get the resource from
   * @param body The content to send. The body is automatically serialized.
   * @param headers Optional headers. Case-Insensitive.
   */
  put<T>(url: string, body?: any, headers?: Record<string, string>): Observable<AjaxResponse<T>>;

  /**
   * Performs an HTTP PATCH using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope by default, and a `responseType` of `"json"`.
   *
   * Before sending the value passed to the `body` argument, it is automatically serialized
   * based on the specified `responseType`. By default, a JavaScript object will be serialized
   * to JSON. A `responseType` of `application/x-www-form-urlencoded` will flatten any provided
   * dictionary object to a url-encoded string.
   *
   * @param url The URL to get the resource from
   * @param body The content to send. The body is automatically serialized.
   * @param headers Optional headers. Case-Insensitive.
   */
  patch<T>(url: string, body?: any, headers?: Record<string, string>): Observable<AjaxResponse<T>>;

  /**
   * Performs an HTTP DELETE using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope by default, and a `responseType` of `"json"`.
   *
   * @param url The URL to get the resource from
   * @param headers Optional headers. Case-Insensitive.
   */
  delete<T>(url: string, headers?: Record<string, string>): Observable<AjaxResponse<T>>;

  /**
   * Performs an HTTP GET using the
   * [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) in
   * global scope by default, and returns the hydrated JavaScript object from the
   * response.
   *
   * @param url The URL to get the resource from
   * @param headers Optional headers. Case-Insensitive.
   */
  getJSON<T>(url: string, headers?: Record<string, string>): Observable<T>;
}

function ajaxGet<T>(url: string, headers?: Record<string, string>): Observable<AjaxResponse<T>> {
  return ajax({ method: 'GET', url, headers });
}

function ajaxPost<T>(url: string, body?: any, headers?: Record<string, string>): Observable<AjaxResponse<T>> {
  return ajax({ method: 'POST', url, body, headers });
}

function ajaxDelete<T>(url: string, headers?: Record<string, string>): Observable<AjaxResponse<T>> {
  return ajax({ method: 'DELETE', url, headers });
}

function ajaxPut<T>(url: string, body?: any, headers?: Record<string, string>): Observable<AjaxResponse<T>> {
  return ajax({ method: 'PUT', url, body, headers });
}

function ajaxPatch<T>(url: string, body?: any, headers?: Record<string, string>): Observable<AjaxResponse<T>> {
  return ajax({ method: 'PATCH', url, body, headers });
}

const mapResponse = map((x: AjaxResponse<any>) => x.response);

function ajaxGetJSON<T>(url: string, headers?: Record<string, string>): Observable<T> {
  return mapResponse(
    ajax<T>({
      method: 'GET',
      url,
      headers,
    })
  );
}

/**
 * There is an ajax operator on the Rx object.
 *
 * It creates an observable for an Ajax request with either a request object with
 * url, headers, etc or a string for a URL.
 *
 * ## Examples
 *
 * Using `ajax()` to fetch the response object that is being returned from API
 *
 * ```ts
 * import { ajax } from 'rxjs/ajax';
 * import { map, catchError, of } from 'rxjs';
 *
 * const obs$ = ajax('https://api.github.com/users?per_page=5').pipe(
 *   map(userResponse => console.log('users: ', userResponse)),
 *   catchError(error => {
 *     console.log('error: ', error);
 *     return of(error);
 *   })
 * );
 *
 * obs$.subscribe({
 *   next: value => console.log(value),
 *   error: err => console.log(err)
 * });
 * ```
 *
 * Using `ajax.getJSON()` to fetch data from API
 *
 * ```ts
 * import { ajax } from 'rxjs/ajax';
 * import { map, catchError, of } from 'rxjs';
 *
 * const obs$ = ajax.getJSON('https://api.github.com/users?per_page=5').pipe(
 *   map(userResponse => console.log('users: ', userResponse)),
 *   catchError(error => {
 *     console.log('error: ', error);
 *     return of(error);
 *   })
 * );
 *
 * obs$.subscribe({
 *   next: value => console.log(value),
 *   error: err => console.log(err)
 * });
 * ```
 *
 * Using `ajax()` with object as argument and method POST with a two seconds delay
 *
 * ```ts
 * import { ajax } from 'rxjs/ajax';
 * import { map, catchError, of } from 'rxjs';
 *
 * const users = ajax({
 *   url: 'https://httpbin.org/delay/2',
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'rxjs-custom-header': 'Rxjs'
 *   },
 *   body: {
 *     rxjs: 'Hello World!'
 *   }
 * }).pipe(
 *   map(response => console.log('response: ', response)),
 *   catchError(error => {
 *     console.log('error: ', error);
 *     return of(error);
 *   })
 * );
 *
 * users.subscribe({
 *   next: value => console.log(value),
 *   error: err => console.log(err)
 * });
 * ```
 *
 * Using `ajax()` to fetch. An error object that is being returned from the request
 *
 * ```ts
 * import { ajax } from 'rxjs/ajax';
 * import { map, catchError, of } from 'rxjs';
 *
 * const obs$ = ajax('https://api.github.com/404').pipe(
 *   map(userResponse => console.log('users: ', userResponse)),
 *   catchError(error => {
 *     console.log('error: ', error);
 *     return of(error);
 *   })
 * );
 *
 * obs$.subscribe({
 *   next: value => console.log(value),
 *   error: err => console.log(err)
 * });
 * ```
 */
export const ajax: AjaxCreationMethod = (() => {
  const create = <T>(urlOrConfig: string | AjaxConfig) => {
    const config: AjaxConfig =
      typeof urlOrConfig === 'string'
        ? {
            url: urlOrConfig,
          }
        : urlOrConfig;
    return fromAjax<T>(config);
  };

  create.get = ajaxGet;
  create.post = ajaxPost;
  create.delete = ajaxDelete;
  create.put = ajaxPut;
  create.patch = ajaxPatch;
  create.getJSON = ajaxGetJSON;

  return create;
})();

const UPLOAD = 'upload';
const DOWNLOAD = 'download';
const LOADSTART = 'loadstart';
const PROGRESS = 'progress';
const LOAD = 'load';

export function fromAjax<T>(init: AjaxConfig): Observable<AjaxResponse<T>> {
  return new Observable((destination) => {
    const config = {
      // Defaults
      async: true,
      crossDomain: false,
      withCredentials: false,
      method: 'GET',
      timeout: 0,
      responseType: 'json' as XMLHttpRequestResponseType,

      ...init,
    };

    const { queryParams, body: configuredBody, headers: configuredHeaders } = config;

    let url = config.url;
    if (!url) {
      throw new TypeError('url is required');
    }

    if (queryParams) {
      let searchParams: URLSearchParams;
      if (url.includes('?')) {
        // If the user has passed a URL with a querystring already in it,
        // we need to combine them. So we're going to split it. There
        // should only be one `?` in a valid URL.
        const parts = url.split('?');
        if (2 < parts.length) {
          throw new TypeError('invalid url');
        }
        // Add the passed queryParams to the params already in the url provided.
        searchParams = new URLSearchParams(parts[1]);
        // queryParams is converted to any because the runtime is *much* more permissive than
        // the types are.
        new URLSearchParams(queryParams as any).forEach((value, key) => searchParams.set(key, value));
        // We have to do string concatenation here, because `new URL(url)` does
        // not like relative URLs like `/this` without a base url, which we can't
        // specify, nor can we assume `location` will exist, because of node.
        url = parts[0] + '?' + searchParams;
      } else {
        // There is no preexisting querystring, so we can just use URLSearchParams
        // to convert the passed queryParams into the proper format and encodings.
        // queryParams is converted to any because the runtime is *much* more permissive than
        // the types are.
        searchParams = new URLSearchParams(queryParams as any);
        url = url + '?' + searchParams;
      }
    }

    // Normalize the headers. We're going to make them all lowercase, since
    // Headers are case insensitive by design. This makes it easier to verify
    // that we aren't setting or sending duplicates.
    const headers: Record<string, any> = {};
    if (configuredHeaders) {
      for (const key in configuredHeaders) {
        if (configuredHeaders.hasOwnProperty(key)) {
          headers[key.toLowerCase()] = configuredHeaders[key];
        }
      }
    }

    const crossDomain = config.crossDomain;

    // Set the x-requested-with header. This is a non-standard header that has
    // come to be a de facto standard for HTTP requests sent by libraries and frameworks
    // using XHR. However, we DO NOT want to set this if it is a CORS request. This is
    // because sometimes this header can cause issues with CORS. To be clear,
    // None of this is necessary, it's only being set because it's "the thing libraries do"
    // Starting back as far as JQuery, and continuing with other libraries such as Angular 1,
    // Axios, et al.
    if (!crossDomain && !('x-requested-with' in headers)) {
      headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // Allow users to provide their XSRF cookie name and the name of a custom header to use to
    // send the cookie.
    const { withCredentials, xsrfCookieName, xsrfHeaderName } = config;
    if ((withCredentials || !crossDomain) && xsrfCookieName && xsrfHeaderName) {
      const xsrfCookie = document?.cookie.match(new RegExp(`(^|;\\s*)(${xsrfCookieName})=([^;]*)`))?.pop() ?? '';
      if (xsrfCookie) {
        headers[xsrfHeaderName] = xsrfCookie;
      }
    }

    // Examine the body and determine whether or not to serialize it
    // and set the content-type in `headers`, if we're able.
    const body = extractContentTypeAndMaybeSerializeBody(configuredBody, headers);

    // The final request settings.
    const _request: Readonly<AjaxRequest> = {
      ...config,

      // Set values we ensured above
      url,
      headers,
      body,
    };

    let xhr: XMLHttpRequest;

    // Create our XHR so we can get started.
    xhr = init.createXHR ? init.createXHR() : new XMLHttpRequest();

    {
      ///////////////////////////////////////////////////
      // set up the events before open XHR
      // https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
      // You need to add the event listeners before calling open() on the request.
      // Otherwise the progress events will not fire.
      ///////////////////////////////////////////////////

      const { progressSubscriber, includeDownloadProgress = false, includeUploadProgress = false } = init;

      /**
       * Wires up an event handler that will emit an error when fired. Used
       * for timeout and abort events.
       * @param type The type of event we're treating as an error
       * @param errorFactory A function that creates the type of error to emit.
       */
      const addErrorEvent = (type: string, errorFactory: () => any) => {
        xhr.addEventListener(type, () => {
          const error = errorFactory();
          progressSubscriber?.error?.(error);
          destination.error(error);
        });
      };

      // If the request times out, handle errors appropriately.
      addErrorEvent('timeout', () => new AjaxTimeoutError(xhr, _request));

      // If the request aborts (due to a network disconnection or the like), handle
      // it as an error.
      addErrorEvent('abort', () => new AjaxError('aborted', xhr, _request));

      /**
       * Creates a response object to emit to the consumer.
       * @param direction the direction related to the event. Prefixes the event `type` in the
       * `AjaxResponse` object with "upload_" for events related to uploading and "download_"
       * for events related to downloading.
       * @param event the actual event object.
       */
      const createResponse = (direction: AjaxDirection, event: ProgressEvent) =>
        new AjaxResponse<T>(event, xhr, _request, `${direction}_${event.type as ProgressEventType}` as const);

      /**
       * Wires up an event handler that emits a Response object to the consumer, used for
       * all events that emit responses, loadstart, progress, and load.
       * Note that download load handling is a bit different below, because it has
       * more logic it needs to run.
       * @param target The target, either the XHR itself or the Upload object.
       * @param type The type of event to wire up
       * @param direction The "direction", used to prefix the response object that is
       * emitted to the consumer. (e.g. "upload_" or "download_")
       */
      const addProgressEvent = (target: any, type: string, direction: AjaxDirection) => {
        target.addEventListener(type, (event: ProgressEvent) => {
          destination.next(createResponse(direction, event));
        });
      };

      if (includeUploadProgress) {
        [LOADSTART, PROGRESS, LOAD].forEach((type) => addProgressEvent(xhr.upload, type, UPLOAD));
      }

      if (progressSubscriber) {
        [LOADSTART, PROGRESS].forEach((type) => xhr.upload.addEventListener(type, (e: any) => progressSubscriber?.next?.(e)));
      }

      if (includeDownloadProgress) {
        [LOADSTART, PROGRESS].forEach((type) => addProgressEvent(xhr, type, DOWNLOAD));
      }

      const emitError = (status?: number) => {
        const msg = 'ajax error' + (status ? ' ' + status : '');
        destination.error(new AjaxError(msg, xhr, _request));
      };

      xhr.addEventListener('error', (e) => {
        progressSubscriber?.error?.(e);
        emitError();
      });

      xhr.addEventListener(LOAD, (event) => {
        const { status } = xhr;
        // 4xx and 5xx should error (https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html)
        if (status < 400) {
          progressSubscriber?.complete?.();

          let response: AjaxResponse<T>;
          try {
            // This can throw in IE, because we end up needing to do a JSON.parse
            // of the response in some cases to produce object we'd expect from
            // modern browsers.
            response = createResponse(DOWNLOAD, event);
          } catch (err) {
            destination.error(err);
            return;
          }

          destination.next(response);
          destination.complete();
        } else {
          progressSubscriber?.error?.(event);
          emitError(status);
        }
      });
    }

    const { user, method, async } = _request;
    // open XHR
    if (user) {
      xhr.open(method, url, async, user, _request.password);
    } else {
      xhr.open(method, url, async);
    }

    // timeout, responseType and withCredentials can be set once the XHR is open
    if (async) {
      xhr.timeout = _request.timeout;
      xhr.responseType = _request.responseType;
    }

    if ('withCredentials' in xhr) {
      xhr.withCredentials = _request.withCredentials;
    }

    // set headers
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }

    // finally send the request
    if (body) {
      xhr.send(body);
    } else {
      xhr.send();
    }

    return () => {
      if (xhr && xhr.readyState !== 4 /*XHR done*/) {
        xhr.abort();
      }
    };
  });
}

/**
 * Examines the body to determine if we need to serialize it for them or not.
 * If the body is a type that XHR handles natively, we just allow it through,
 * otherwise, if the body is something that *we* can serialize for the user,
 * we will serialize it, and attempt to set the `content-type` header, if it's
 * not already set.
 * @param body The body passed in by the user
 * @param headers The normalized headers
 */
function extractContentTypeAndMaybeSerializeBody(body: any, headers: Record<string, string>) {
  if (
    !body ||
    typeof body === 'string' ||
    isFormData(body) ||
    isURLSearchParams(body) ||
    isArrayBuffer(body) ||
    isFile(body) ||
    isBlob(body) ||
    isReadableStream(body)
  ) {
    // The XHR instance itself can handle serializing these, and set the content-type for us
    // so we don't need to do that. https://xhr.spec.whatwg.org/#the-send()-method
    return body;
  }

  if (isArrayBufferView(body)) {
    // This is a typed array (e.g. Float32Array or Uint8Array), or a DataView.
    // XHR can handle this one too: https://fetch.spec.whatwg.org/#concept-bodyinit-extract
    return body.buffer;
  }

  if (typeof body === 'object') {
    // If we have made it here, this is an object, probably a POJO, and we'll try
    // to serialize it for them. If this doesn't work, it will throw, obviously, which
    // is okay. The workaround for users would be to manually set the body to their own
    // serialized string (accounting for circular references or whatever), then set
    // the content-type manually as well.
    headers['content-type'] = headers['content-type'] ?? 'application/json;charset=utf-8';
    return JSON.stringify(body);
  }

  // If we've gotten past everything above, this is something we don't quite know how to
  // handle. Throw an error. This will be caught and emitted from the observable.
  throw new TypeError('Unknown body type');
}

const _toString = Object.prototype.toString;

function toStringCheck(obj: any, name: string): boolean {
  return _toString.call(obj) === `[object ${name}]`;
}

function isArrayBuffer(body: any): body is ArrayBuffer {
  return toStringCheck(body, 'ArrayBuffer');
}

function isFile(body: any): body is File {
  return toStringCheck(body, 'File');
}

function isBlob(body: any): body is Blob {
  return toStringCheck(body, 'Blob');
}

function isArrayBufferView(body: any): body is ArrayBufferView {
  return typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(body);
}

function isFormData(body: any): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function isURLSearchParams(body: any): body is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;
}

function isReadableStream(body: any): body is ReadableStream {
  return typeof ReadableStream !== 'undefined' && body instanceof ReadableStream;
}
