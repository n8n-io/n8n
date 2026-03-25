import { Request } from './request';
import type { Headers } from './types';
export declare const REGEXP_CONTENT_TYPE_JSON: RegExp;
export interface ResponseParams {
    readonly status?: number;
    readonly rawData?: string;
    readonly headers?: Headers;
    readonly error?: Error;
}
/**
 * @typedef Response
 * @param {Request} originalRequest, for auth it hides the password
 * @param {Integer} responseStatus
 * @param {String} responseData, defaults to null
 * @param {Object} responseHeaders, defaults to an empty object ({})
 * @param {Array<Error>} errors, defaults to an empty array ([])
 */
type SerializableJSON = number | string | boolean | null | Record<string, unknown>;
export type ParsedJSON = SerializableJSON | SerializableJSON[];
export declare class Response<DataType extends ParsedJSON = ParsedJSON> {
    readonly originalRequest: Request;
    readonly responseStatus: number;
    readonly responseData: string | null;
    readonly responseHeaders: Headers;
    readonly errors: Array<Error | string>;
    timeElapsed: number | null;
    constructor(originalRequest: Request, responseStatus: number, responseData?: string | null, responseHeaders?: Headers, errors?: Array<Error | string>);
    request(): Request;
    status(): number;
    /**
     * Returns true if status is greater or equal 200 or lower than 400
     */
    success(): boolean;
    /**
     * Returns an object with the headers. Header names are converted to
     * lowercase
     */
    headers(): import("./types").Hash;
    /**
     * Utility method to get a header value by name
     */
    header<T extends string | number | boolean>(name: string): T | undefined;
    /**
     * Returns the original response data
     */
    rawData(): string | null;
    /**
     * Returns the response data, if "Content-Type" is "application/json"
     * it parses the response and returns an object.
     * Friendly reminder:
     *  - JSON.parse() can return null, an Array or an object.
     */
    data<T = DataType>(): T;
    isContentTypeJSON(): boolean;
    /**
     * Returns the last error instance that caused the request to fail
     */
    error(): Error | null;
    /**
     * Enhances current Response returning a new Response
     *
     * @param {Object} extras
     *   @param {Integer} extras.status - it will replace the current status
     *   @param {String} extras.rawData - it will replace the current rawData
     *   @param {Object} extras.headers - it will be merged with current headers
     *   @param {Error} extras.error    - it will be added to the list of errors
     */
    enhance(extras: ResponseParams): Response<DataType>;
}
export default Response;
