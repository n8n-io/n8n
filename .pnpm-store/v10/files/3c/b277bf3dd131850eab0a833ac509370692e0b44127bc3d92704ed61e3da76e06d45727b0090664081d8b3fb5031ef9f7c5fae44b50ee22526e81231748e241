/**
 * (C) Copyright IBM Corp. 2014, 2024.
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
/// <reference types="node" />
import type { CookieJar } from 'tough-cookie';
import { OutgoingHttpHeaders } from 'http';
import { AuthenticatorInterface } from '../auth';
import { RetryOptions } from './request-wrapper';
/**
 * Configuration values for a service.
 */
export interface UserOptions {
    /** The Authenticator object used to authenticate requests to the service */
    authenticator?: AuthenticatorInterface;
    /** The base url to use when contacting the service. The base url may differ between IBM Cloud regions. */
    serviceUrl?: string;
    /** Default headers that shall be included with every request to the service. */
    headers?: OutgoingHttpHeaders;
    /** The API version date to use with the service, in "YYYY-MM-DD" format. */
    version?: string;
    /** Set to `true` to allow unauthorized requests - not recommended for production use. */
    disableSslVerification?: boolean;
    /** Set your own cookie jar object */
    jar?: CookieJar | boolean;
    /** Deprecated. Use `serviceUrl` instead. */
    url?: string;
    /** Allow additional request config parameters */
    [propName: string]: any;
}
/**
 * Additional service configuration.
 */
export interface BaseServiceOptions extends UserOptions {
    /** Querystring to be sent with every request. If not a string will be stringified. */
    qs?: any;
    enableRetries?: boolean;
    maxRetries?: number;
    retryInterval?: number;
}
/**
 * Common functionality shared by generated service classes.
 *
 * The base service authenticates requests via its authenticator, and sends
 * them to the service endpoint.
 */
export declare class BaseService {
    static DEFAULT_SERVICE_URL: string;
    static DEFAULT_SERVICE_NAME: string;
    protected baseOptions: BaseServiceOptions;
    private authenticator;
    private requestWrapperInstance;
    private defaultUserAgent;
    /**
     * Configuration values for a service.
     *
     * @param userOptions - the configuration options to set on the service instance.
     * This should be an object with the following fields:
     * - authenticator: (required) an Object used to authenticate requests to the service.
     * - serviceUrl: (optional) the base url to use when contacting the service.
     *   The base url may differ between IBM Cloud regions.
     * - headers: (optional) a set of HTTP headers that should be included with every request sent to the service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the server's SSL certificate should be
     *   disabled or not.
     */
    constructor(userOptions: UserOptions);
    /**
     * Get the instance of the authenticator set on the service.
     *
     * @returns the Authenticator instance
     */
    getAuthenticator(): any;
    /**
     * Set the service URL to send requests to.
     *
     * @param url - the base URL for the service.
     */
    setServiceUrl(url: string): void;
    /**
     * Set the HTTP headers to be sent in every request.
     *
     * @param headers - the map of headers to include in requests.
     */
    setDefaultHeaders(headers: OutgoingHttpHeaders): void;
    /**
     * Turn request body compression on or off.
     *
     * @param setting - Will turn it on if 'true', off if 'false'.
     */
    setEnableGzipCompression(setting: boolean): void;
    /**
     * Get the Axios instance set on the service.
     * All requests will be made using this instance.
     */
    getHttpClient(): import("axios").AxiosInstance;
    /**
     * Enable retries for unfulfilled requests.
     *
     * @param retryOptions - the configuration for retries
     */
    enableRetries(retryOptions?: RetryOptions): void;
    /**
     * Disables retries.
     */
    disableRetries(): void;
    /**
     * Applies a given modifier function on a model object.
     * Since the model object can be a map, or an array, or a model,
     * these types needs different handling.
     * Considering whether the input object is a map happens with an explicit parameter.
     * @param input - the input model object
     * @param converterFn - the function that is applied on the input object
     * @param isMap - is `true` when the input object should be handled as a map
     */
    static convertModel(input: any, converterFn: any, isMap?: boolean): any;
    /**
     * Configure the service using external configuration
     *
     * @param serviceName - the name of the service. This will be used to read from external
     * configuration.
     */
    protected configureService(serviceName: string): void;
    /**
     * Wrapper around `sendRequest` that enforces the request will be authenticated.
     *
     * @param parameters - Service request options passed in by user.
     * This should be an object with the following fields:
     * - options.method: the http method
     * - options.url: the path portion of the URL to be appended to the serviceUrl
     * - options.path: the path parameters to be inserted into the URL
     * - options.qs: the querystring to be included in the URL
     * - options.body: the data to be sent as the request body
     * - options.form: an object containing the key/value pairs for a www-form-urlencoded request.
     * - options.formData: an object containing the contents for a multipart/form-data request
     *   The following processing is performed on formData values:
     *     - string: no special processing -- the value is sent as is
     *     - object: the value is converted to a JSON string before insertion into the form body
     *     - NodeJS.ReadableStream|Buffer|FileWithMetadata: sent as a file, with any associated metadata
     *     - array: each element of the array is sent as a separate form part using any special processing as described above
     * - defaultOptions.serviceUrl: the base URL of the service
     * - defaultOptions.headers: additional HTTP headers to be sent with the request
     * @returns a Promise
     */
    protected createRequest(parameters: any): Promise<any>;
    /**
     * Wrapper around `createRequest` that enforces arrived response to be deserialized.
     * @param parameters - see `parameters` in `createRequest`
     * @param deserializerFn - the deserializer function that is applied on the response object
     * @param isMap - is `true` when the response object should be handled as a map
     * @returns a Promise
     */
    protected createRequestAndDeserializeResponse(parameters: any, deserializerFn: (any: any) => any, isMap?: boolean): Promise<any>;
    private readOptionsFromExternalConfig;
    private static convertArray;
    private static convertMap;
}
