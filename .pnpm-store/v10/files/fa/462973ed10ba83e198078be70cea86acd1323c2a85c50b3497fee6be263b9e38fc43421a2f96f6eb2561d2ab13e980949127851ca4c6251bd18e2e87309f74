/**
 * (C) Copyright IBM Corp. 2014, 2025.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { AxiosInstance } from 'axios';
/**
 * Retry configuration options.
 */
export interface RetryOptions {
    /**
     * Maximum retries to attempt.
     */
    maxRetries?: number;
    /**
     * Ceiling for the retry delay (in seconds) - delay will not exceed this value.
     */
    maxRetryInterval?: number;
}
export declare class RequestWrapper {
    private axiosInstance;
    private compressRequestData;
    private retryInterceptorId;
    private raxConfig;
    constructor(axiosOptions?: any);
    /**
     * Formats the specified Axios request for debug logging.
     * @param request - the request to be logged
     * @returns the string representation of the request
     */
    private formatAxiosRequest;
    /**
     * Formats the specified Axios response for debug logging.
     * @param response - the response to be logged
     * @returns the string representation of the response
     */
    private formatAxiosResponse;
    /**
     * Formats the specified Axios error for debug logging.
     * @param error - the error to be logged
     * @returns the string representation of the error
     */
    private formatAxiosError;
    /**
     * Formats 'headers' to be included in the debug output
     * like this:
     *    Accept: application/json
     *    Content-Type: application/json
     *    My-Header: my-value
     *    ...
     * @param headers - the headers associated with an Axios request or response
     * @returns the formatted output to be included in the HTTP message traces
     */
    private formatAxiosHeaders;
    /**
     * Formats 'body' (either a string or object/array) to be included in the debug output
     *
     * @param body - a string, object or array that contains the request or response body
     * @returns the formatted output to be included in the HTTP message traces
     */
    private formatAxiosBody;
    setCompressRequestData(setting: boolean): void;
    /**
     * Creates the request.
     * 1. Merge default options with user provided options
     * 2. Checks for missing parameters
     * 3. Encode path and query parameters
     * 4. Call the api
     * @returns ReadableStream|undefined
     * @throws Error
     */
    sendRequest(parameters: any): Promise<any>;
    /**
     * Format error returned by axios
     * @param axiosError - the object returned by axios via rejection
     * @returns the Error object
     */
    formatError(axiosError: any): Error;
    getHttpClient(): AxiosInstance;
    private static getRaxConfig;
    enableRetries(retryOptions?: RetryOptions): void;
    disableRetries(): void;
    /**
     * Returns true iff the previously-failed request contained in "error" should be retried.
     * @param error - an AxiosError instance that contains a previously-failed request
     * @returns true iff the request should be retried
     */
    private static retryPolicy;
    private gzipRequestBody;
}
