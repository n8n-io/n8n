import { b as Response } from '../index-Dky6y1YD.mjs';
import MockAssert from './mock-assert.mjs';
import '../types.mjs';

/**
 * @param {number} id
 * @param {object} props
 *   @param {string} props.method
 *   @param {string|function} props.url
 *   @param {string|function} props.body - request body
 *   @param {object} props.response
 *     @param {string} props.response.body
 *     @param {object} props.response.headers
 *     @param {integer} props.response.status
 */
declare function MockRequest(id: number, props: {
    method: string;
    url: string | Function;
    body: string | Function;
    response: {
        body: string;
        headers: object;
        status: integer;
    };
}): void;
declare class MockRequest {
    /**
     * @param {number} id
     * @param {object} props
     *   @param {string} props.method
     *   @param {string|function} props.url
     *   @param {string|function} props.body - request body
     *   @param {object} props.response
     *     @param {string} props.response.body
     *     @param {object} props.response.headers
     *     @param {integer} props.response.status
     */
    constructor(id: number, props: {
        method: string;
        url: string | Function;
        body: string | Function;
        response: {
            body: string;
            headers: object;
            status: integer;
        };
    });
    id: number;
    method: string;
    urlFunction: boolean;
    url: string | Function;
    bodyFunction: boolean;
    body: any;
    headersFunction: boolean;
    headers: any;
    headersObject: any;
    responseHeaders: object;
    responseHandler: any;
    statusFunction: boolean;
    responseStatus: any;
    calls: any[];
    /**
     * If passed a plain object, the data is stringified and the content-type header is set to JSON
     *
     * @public
     */
    setResponseData(responseData: any): void;
    responseData: any;
    /**
     * @return {Response}
     */
    call(request: any): Response;
    /**
     * @return {MockAssert}
     */
    assertObject(): MockAssert;
    /**
     * Checks if the request matches with the mock HTTP method, URL, headers and body
     *
     * @return {boolean}
     */
    isExactMatch(request: any): boolean;
    /**
     * Checks if the request partially matches the mock HTTP method and URL
     *
     * @return {boolean}
     */
    isPartialMatch(request: any): boolean;
    /**
     * @return {MockRequest}
     */
    toMockRequest(): MockRequest;
}

export { MockRequest as default };
