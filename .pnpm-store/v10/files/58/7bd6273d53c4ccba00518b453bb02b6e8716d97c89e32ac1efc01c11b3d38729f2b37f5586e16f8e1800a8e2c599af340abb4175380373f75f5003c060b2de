/**
 * Copyright 2020 Google LLC
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
/**
 * Google API Extensions
 */
import type { Message } from 'protobufjs';
import { GoogleError } from './googleError';
import { BundleOptions } from './bundlingCalls/bundleExecutor';
import { RequestType } from './apitypes';
/**
 * Encapsulates the overridable settings for a particular API call.
 *
 * ``CallOptions`` is an optional arg for all GAX API calls.  It is used to
 * configure the settings of a specific API call.
 *
 * When provided, its values override the GAX service defaults for that
 * particular call.
 *
 * Typically the API clients will accept this as the second to the last
 * argument. See the examples below.
 * @typedef {Object} CallOptions
 * @property {number=} timeout - The client-side timeout for API calls.
 * @property {RetryOptions=} retry - determines whether and how to retry
 *   on transient errors. When set to null, the call will not retry.
 * @property {boolean=} autoPaginate - If set to false and the call is
 *   configured for paged iteration, page unrolling is not performed, instead
 *   the callback will be called with the response object.
 * @property {Object=} pageToken - If set and the call is configured for
 *   paged iteration, paged iteration is not performed and requested with this
 *   pageToken.
 * @property {number} maxResults - If set and the call is configured for
 *   paged iteration, the call will stop when the number of response elements
 *   reaches to the specified size. By default, it will unroll the page to
 *   the end of the list.
 * @property {boolean=} isBundling - If set to false and the call is configured
 *   for bundling, bundling is not performed.
 * @property {BackoffSettings=} longrunning - BackoffSettings used for polling.
 * @example
 * // suppress bundling for bundled method.
 * api.bundlingMethod(
 *     param, {optParam: aValue, isBundling: false}, function(err, response) {
 *   // handle response.
 * });
 * @example
 * // suppress streaming for page-streaming method.
 * api.pageStreamingMethod(
 *     param, {optParam: aValue, autoPaginate: false}, function(err, page) {
 *   // not returning a stream, but callback is called with the paged response.
 * });
 */
/**
 * Per-call configurable settings for retrying upon transient failure.
 * @implements {RetryOptionsType}
 * @typedef {Object} RetryOptions
 * @property {number[]} retryCodes
 * @property {BackoffSettings} backoffSettings
 * @property {(function)} shouldRetryFn
 * @property {(function)} getResumptionRequestFn
 */
export declare class RetryOptions {
    retryCodes: number[];
    backoffSettings: BackoffSettings;
    shouldRetryFn?: (error: GoogleError) => boolean;
    getResumptionRequestFn?: (request: RequestType) => RequestType;
    constructor(retryCodes: number[], backoffSettings: BackoffSettings, shouldRetryFn?: (error: GoogleError) => boolean, getResumptionRequestFn?: (request: RequestType) => RequestType);
}
/**
 * Per-call configurable settings for working with retry-request
 * See the repo README for more about the parameters
 * https://github.com/googleapis/retry-request
 * Will be deprecated in a future release. Only relevant to server streaming calls
 * @typedef {Object} RetryOptions
 * @property {boolean} objectMode - when true utilizes object mode in streams
 * @property {request} request - the request to retry
 * @property {number} noResponseRetries - number of times to retry on no response
 * @property {number} currentRetryAttempt - what # retry attempt retry-request is on
 * @property {Function} shouldRetryFn - determines whether to retry, returns a boolean
 * @property {number} maxRetryDelay - maximum retry delay in seconds
 * @property {number} retryDelayMultiplier - multiplier to increase the delay in between completion of failed requests
 * @property {number} totalTimeout - total timeout in seconds
 */
export interface RetryRequestOptions {
    objectMode?: boolean;
    request?: any;
    retries?: number;
    noResponseRetries?: number;
    currentRetryAttempt?: number;
    shouldRetryFn?: (error: GoogleError) => boolean;
    maxRetryDelay?: number;
    retryDelayMultiplier?: number;
    totalTimeout?: number;
}
/**
 * Parameters to the exponential backoff algorithm for retrying.
 * @typedef {Object} BackoffSettings
 * @property {number} initialRetryDelayMillis - the initial delay time,
 *   in milliseconds, between the completion of the first failed request and the
 *   initiation of the first retrying request.
 * @property {number} retryDelayMultiplier - the multiplier by which to
 *   increase the delay time between the completion of failed requests, and the
 *   initiation of the subsequent retrying request.
 * @property {number} maxRetryDelayMillis - the maximum delay time, in
 *   milliseconds, between requests. When this value is reached,
 *   ``retryDelayMultiplier`` will no longer be used to increase delay time.
 * @property {number} initialRpcTimeoutMillis - the initial timeout parameter
 *   to the request.
 * @propetry {number} rpcTimeoutMultiplier - the multiplier by which to
 *   increase the timeout parameter between failed requests.
 * @property {number} maxRpcTimeoutMillis - the maximum timeout parameter, in
 *   milliseconds, for a request. When this value is reached,
 *   ``rpcTimeoutMultiplier`` will no longer be used to increase the timeout.
 * @property {number} totalTimeoutMillis - the total time, in milliseconds,
 *   starting from when the initial request is sent, after which an error will
 *   be returned, regardless of the retrying attempts made meanwhile.
 */
export interface BackoffSettings {
    maxRetries?: number;
    initialRetryDelayMillis: number;
    retryDelayMultiplier: number;
    maxRetryDelayMillis: number;
    initialRpcTimeoutMillis?: number | null;
    maxRpcTimeoutMillis?: number | null;
    totalTimeoutMillis?: number | null;
    rpcTimeoutMultiplier?: number | null;
}
export interface CallOptions {
    timeout?: number;
    retry?: Partial<RetryOptions> | null;
    autoPaginate?: boolean;
    maxResults?: number;
    maxRetries?: number;
    otherArgs?: {
        [index: string]: any;
    };
    bundleOptions?: BundleOptions | null;
    isBundling?: boolean;
    longrunning?: BackoffSettings;
    apiName?: string;
    retryRequestOptions?: RetryRequestOptions;
}
export declare class CallSettings {
    timeout: number;
    retry?: RetryOptions | null;
    autoPaginate?: boolean;
    pageToken?: string;
    pageSize?: number;
    maxResults?: number;
    otherArgs: {
        [index: string]: any;
    };
    bundleOptions?: BundleOptions | null;
    isBundling: boolean;
    longrunning?: BackoffSettings;
    apiName?: string;
    retryRequestOptions?: RetryRequestOptions;
    /**
     * @param {Object} settings - An object containing parameters of this settings.
     * @param {number} settings.timeout - The client-side timeout for API calls.
     *   This parameter is ignored for retrying calls.
     * @param {RetryOptions} settings.retry - The configuration for retrying upon
     *   transient error. If set to null, this call will not retry.
     * @param {boolean} settings.autoPaginate - If there is no `pageDescriptor`,
     *   this attrbute has no meaning. Otherwise, determines whether a page
     * streamed response should make the page structure transparent to the user by
     *   flattening the repeated field in the returned generator.
     * @param {number} settings.pageToken - If there is no `pageDescriptor`,
     *   this attribute has no meaning. Otherwise, determines the page token used
     * in the page streaming request.
     * @param {Object} settings.otherArgs - Additional arguments to be passed to
     *   the API calls.
     *
     * @constructor
     */
    constructor(settings?: CallOptions);
    /**
     * Returns a new CallSettings merged from this and a CallOptions object.
     *
     * @param {CallOptions} options - an instance whose values override
     *   those in this object. If null, ``merge`` returns a copy of this
     *   object
     * @return {CallSettings} The merged CallSettings instance.
     */
    merge(options?: CallOptions | null): CallSettings;
}
/**
 * Validates passed retry options in preparation for eventual parameter deprecation
 * converts retryRequestOptions to retryOptions
 * then sets retryRequestOptions to null
 *
 * @param {CallOptions} options - a list of passed retry option
 * @return {CallOptions} A new CallOptions object.
 *
 */
export declare function convertRetryOptions(options?: CallOptions, gaxStreamingRetries?: boolean): CallOptions | undefined;
/**
 * Per-call configurable settings for retrying upon transient failure.
 * @param {number[]} retryCodes - a list of Google API canonical error codes OR a function that returns a boolean to determine retry behavior
 *   upon which a retry should be attempted.
 * @param {BackoffSettings} backoffSettings - configures the retry
 *   exponential backoff algorithm.
 * @param {function} shouldRetryFn - a function that determines whether a call should retry. If this is defined retryCodes must be empty
 * @param {function} getResumptionRequestFn - a function with a resumption strategy - only used with server streaming retries
 * @return {RetryOptions} A new RetryOptions object.
 *
 */
export declare function createRetryOptions(retryCodes: number[], backoffSettings: BackoffSettings, shouldRetryFn?: (error: GoogleError) => boolean, getResumptionRequestFn?: (request: RequestType) => RequestType): RetryOptions;
/**
 * Parameters to the exponential backoff algorithm for retrying.
 *
 * @param {number} initialRetryDelayMillis - the initial delay time,
 *   in milliseconds, between the completion of the first failed request and the
 *   initiation of the first retrying request.
 * @param {number} retryDelayMultiplier - the multiplier by which to
 *   increase the delay time between the completion of failed requests, and the
 *   initiation of the subsequent retrying request.
 * @param {number} maxRetryDelayMillis - the maximum delay time, in
 *   milliseconds, between requests. When this value is reached,
 *   ``retryDelayMultiplier`` will no longer be used to increase delay time.
 * @param {number} initialRpcTimeoutMillis - the initial timeout parameter
 *   to the request.
 * @param {number} rpcTimeoutMultiplier - the multiplier by which to
 *   increase the timeout parameter between failed requests.
 * @param {number} maxRpcTimeoutMillis - the maximum timeout parameter, in
 *   milliseconds, for a request. When this value is reached,
 *   ``rpcTimeoutMultiplier`` will no longer be used to increase the timeout.
 * @param {number} totalTimeoutMillis - the total time, in milliseconds,
 *   starting from when the initial request is sent, after which an error will
 *   be returned, regardless of the retrying attempts made meanwhile.
 * @return {BackoffSettings} a new settings.
 *
 */
export declare function createBackoffSettings(initialRetryDelayMillis: number, retryDelayMultiplier: number, maxRetryDelayMillis: number, initialRpcTimeoutMillis: number | null, rpcTimeoutMultiplier: number | null, maxRpcTimeoutMillis: number | null, totalTimeoutMillis: number | null): BackoffSettings;
export declare function createDefaultBackoffSettings(): BackoffSettings;
/**
 * Parameters to the exponential backoff algorithm for retrying.
 * This function is unsupported, and intended for internal use only.
 *
 * @param {number} initialRetryDelayMillis - the initial delay time,
 *   in milliseconds, between the completion of the first failed request and the
 *   initiation of the first retrying request.
 * @param {number} retryDelayMultiplier - the multiplier by which to
 *   increase the delay time between the completion of failed requests, and the
 *   initiation of the subsequent retrying request.
 * @param {number} maxRetryDelayMillis - the maximum delay time, in
 *   milliseconds, between requests. When this value is reached,
 *   ``retryDelayMultiplier`` will no longer be used to increase delay time.
 * @param {number} initialRpcTimeoutMillis - the initial timeout parameter
 *   to the request.
 * @param {number} rpcTimeoutMultiplier - the multiplier by which to
 *   increase the timeout parameter between failed requests.
 * @param {number} maxRpcTimeoutMillis - the maximum timeout parameter, in
 *   milliseconds, for a request. When this value is reached,
 *   ``rpcTimeoutMultiplier`` will no longer be used to increase the timeout.
 * @param {number} maxRetries - the maximum number of retrying attempts that
 *   will be made. If reached, an error will be returned.
 * @return {BackoffSettings} a new settings.
 *
 */
export declare function createMaxRetriesBackoffSettings(initialRetryDelayMillis: number, retryDelayMultiplier: number, maxRetryDelayMillis: number, initialRpcTimeoutMillis: number, rpcTimeoutMultiplier: number, maxRpcTimeoutMillis: number, maxRetries: number): BackoffSettings;
/**
 * Creates a new {@link BundleOptions}.
 *
 * @private
 * @param {Object} options - An object to hold optional parameters. See
 *   properties for the content of options.
 * @return {BundleOptions} - A new options.
 */
export declare function createBundleOptions(options: BundlingConfig): BundleOptions;
export interface ServiceConfig {
    retry_codes?: {
        [index: string]: string[];
    };
    retry_params?: {
        [index: string]: RetryParamsConfig;
    };
    methods: {
        [index: string]: MethodConfig | null;
    };
}
export interface RetryParamsConfig {
    initial_retry_delay_millis: number;
    retry_delay_multiplier: number;
    max_retry_delay_millis: number;
    initial_rpc_timeout_millis: number;
    rpc_timeout_multiplier: number;
    max_rpc_timeout_millis: number;
    total_timeout_millis: number;
}
export interface MethodConfig {
    retry_codes_name?: string;
    retry_params_name?: string;
    bundling?: BundlingConfig | null;
    timeout_millis?: number;
}
export interface BundlingConfig {
    element_count_threshold: number;
    element_count_limit: number;
    request_byte_threshold?: number;
    request_byte_limit?: number;
    delay_threshold_millis?: number;
}
export interface ClientConfig {
    interfaces?: {
        [index: string]: ServiceConfig;
    };
}
/**
 * Constructs a dictionary mapping method names to {@link CallSettings}.
 *
 * The `clientConfig` parameter is parsed from a client configuration JSON
 * file of the form:
 *
 *     {
 *       "interfaces": {
 *         "google.fake.v1.ServiceName": {
 *           "retry_codes": {
 *             "idempotent": ["UNAVAILABLE", "DEADLINE_EXCEEDED"],
 *             "non_idempotent": []
 *           },
 *           "retry_params": {
 *             "default": {
 *               "initial_retry_delay_millis": 100,
 *               "retry_delay_multiplier": 1.2,
 *               "max_retry_delay_millis": 1000,
 *               "initial_rpc_timeout_millis": 2000,
 *               "rpc_timeout_multiplier": 1.5,
 *               "max_rpc_timeout_millis": 30000,
 *               "total_timeout_millis": 45000
 *             }
 *           },
 *           "methods": {
 *             "CreateFoo": {
 *               "retry_codes_name": "idempotent",
 *               "retry_params_name": "default"
 *             },
 *             "Publish": {
 *               "retry_codes_name": "non_idempotent",
 *               "retry_params_name": "default",
 *               "bundling": {
 *                 "element_count_threshold": 40,
 *                 "element_count_limit": 200,
 *                 "request_byte_threshold": 90000,
 *                 "request_byte_limit": 100000,
 *                 "delay_threshold_millis": 100
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *
 * @param {String} serviceName - The fully-qualified name of this
 *   service, used as a key into the client config file (in the
 *   example above, this value should be 'google.fake.v1.ServiceName').
 * @param {Object} clientConfig - A dictionary parsed from the
 *   standard API client config file.
 * @param {Object} configOverrides - A dictionary in the same structure of
 *   client_config to override the settings.
 * @param {Object.<string, string[]>} retryNames - A dictionary mapping the strings
 *   referring to response status codes to objects representing
 *   those codes.
 * @param {Object} otherArgs - the non-request arguments to be passed to the API
 *   calls.
 * @return {Object} A mapping from method name to CallSettings, or null if the
 *   service is not found in the config.
 */
export declare function constructSettings(serviceName: string, clientConfig: ClientConfig, configOverrides: ClientConfig, retryNames: {}, otherArgs?: {}): any;
export declare function createByteLengthFunction(message: typeof Message): (obj: {}) => number;
