import { MethodDescriptor } from './method-descriptor';
import type { Auth, Body, Headers, RequestParams } from './types';
export type RequestContext = Record<string, unknown>;
/**
 * Removes the object type without removing Record types in the union
 */
export type ExcludeObject<T> = T extends object ? (object extends T ? never : T) : T;
/**
 * @typedef Request
 * @param {MethodDescriptor} methodDescriptor
 * @param {RequestParams} requestParams, defaults to an empty object ({})
 * @param {RequestContext} request context store, defaults to an empty object ({})
 */
export declare class Request {
    methodDescriptor: MethodDescriptor;
    requestParams: RequestParams;
    private requestContext;
    constructor(methodDescriptor: MethodDescriptor, requestParams?: RequestParams, requestContext?: RequestContext);
    private isParam;
    params(): RequestParams;
    /**
     * Returns the request context; a key value object.
     * Useful to pass information from upstream middleware to a downstream one.
     */
    context<T extends RequestContext = RequestContext>(): T;
    /**
     * Returns the HTTP method in lowercase
     */
    method(): string;
    /**
     * Returns host name without trailing slash
     * Example: 'http://example.org'
     */
    host(): string;
    /**
     * Returns path with parameters and leading slash.
     * Example: '/some/path?param1=true'
     *
     * @throws {Error} if any dynamic segment is missing.
     * Example:
     *  Imagine the path '/some/{name}', the error will be similar to:
     *    '[Mappersmith] required parameter missing (name), "/some/{name}" cannot be resolved'
     */
    path(): string;
    /**
     * Returns the template path, without params, before interpolation.
     * If path is a function, returns the result of request.path()
     * Example: '/some/{param}/path'
     */
    pathTemplate(): string;
    /**
     * Returns the full URL
     * Example: http://example.org/some/path?param1=true
     *
     */
    url(): string;
    /**
     * Returns an object with the headers. Header names are converted to
     * lowercase
     */
    headers(): Headers;
    /**
     * Utility method to get a header value by name
     */
    header<T extends string | number | boolean>(name: string): T | undefined;
    body(): Body | undefined;
    auth(): Auth | undefined;
    timeout(): number | undefined;
    signal(): AbortSignal | undefined;
    /**
     * Enhances current request returning a new Request
     * @param {RequestParams} extras
     *   @param {Object} extras.auth - it will replace the current auth
     *   @param {String|Object} extras.body - it will replace the current body
     *   @param {Headers} extras.headers - it will be merged with current headers
     *   @param {String} extras.host - it will replace the current timeout
     *   @param {RequestParams} extras.params - it will be merged with current params
     *   @param {Number} extras.timeout - it will replace the current timeout
     * @param {Object} requestContext - Use to pass information between different middleware.
     */
    enhance(extras: RequestParams, requestContext?: RequestContext): Request;
    /**
     * Is the request expecting a binary response?
     */
    isBinary(): boolean;
}
export default Request;
