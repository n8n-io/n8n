import { Observable } from '../Observable';
import { AjaxConfig } from './types';
import { AjaxResponse } from './AjaxResponse';
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
export declare const ajax: AjaxCreationMethod;
export declare function fromAjax<T>(init: AjaxConfig): Observable<AjaxResponse<T>>;
//# sourceMappingURL=ajax.d.ts.map