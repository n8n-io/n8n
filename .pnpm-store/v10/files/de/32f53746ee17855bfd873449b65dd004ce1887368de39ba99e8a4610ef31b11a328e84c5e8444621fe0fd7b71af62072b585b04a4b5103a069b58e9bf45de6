"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallSettings = exports.RetryOptions = void 0;
exports.convertRetryOptions = convertRetryOptions;
exports.createRetryOptions = createRetryOptions;
exports.createBackoffSettings = createBackoffSettings;
exports.createDefaultBackoffSettings = createDefaultBackoffSettings;
exports.createMaxRetriesBackoffSettings = createMaxRetriesBackoffSettings;
exports.createBundleOptions = createBundleOptions;
exports.constructSettings = constructSettings;
exports.createByteLengthFunction = createByteLengthFunction;
const warnings_1 = require("./warnings");
const util_1 = require("./util");
const status_1 = require("./status");
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
class RetryOptions {
    constructor(retryCodes, backoffSettings, shouldRetryFn, getResumptionRequestFn) {
        this.retryCodes = retryCodes;
        this.backoffSettings = backoffSettings;
        this.shouldRetryFn = shouldRetryFn;
        this.getResumptionRequestFn = getResumptionRequestFn;
    }
}
exports.RetryOptions = RetryOptions;
class CallSettings {
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
    constructor(settings) {
        var _a;
        settings = settings || {};
        this.timeout = settings.timeout || 30 * 1000;
        this.retry = settings.retry;
        this.autoPaginate =
            'autoPaginate' in settings ? settings.autoPaginate : true;
        this.maxResults = settings.maxResults;
        this.otherArgs = settings.otherArgs || {};
        this.bundleOptions = settings.bundleOptions;
        this.isBundling = 'isBundling' in settings ? settings.isBundling : true;
        this.longrunning =
            'longrunning' in settings ? settings.longrunning : undefined;
        this.apiName = (_a = settings.apiName) !== null && _a !== void 0 ? _a : undefined;
        this.retryRequestOptions = settings.retryRequestOptions;
    }
    /**
     * Returns a new CallSettings merged from this and a CallOptions object.
     *
     * @param {CallOptions} options - an instance whose values override
     *   those in this object. If null, ``merge`` returns a copy of this
     *   object
     * @return {CallSettings} The merged CallSettings instance.
     */
    merge(options) {
        if (!options) {
            return new CallSettings(this);
        }
        let timeout = this.timeout;
        let retry = this.retry;
        let autoPaginate = this.autoPaginate;
        let maxResults = this.maxResults;
        let otherArgs = this.otherArgs;
        let isBundling = this.isBundling;
        let longrunning = this.longrunning;
        let apiName = this.apiName;
        let retryRequestOptions = this.retryRequestOptions;
        // If the user provides a timeout to the method, that timeout value will be used
        // to override the backoff settings.
        if ('timeout' in options) {
            timeout = options.timeout;
        }
        // If a method-specific timeout is set in the service config, and the retry codes for that
        // method are non-null, then that timeout value will be used to
        // override backoff settings.
        if (retry === null || retry === void 0 ? void 0 : retry.retryCodes) {
            retry.backoffSettings.initialRpcTimeoutMillis = timeout;
            retry.backoffSettings.maxRpcTimeoutMillis = timeout;
            retry.backoffSettings.totalTimeoutMillis = timeout;
        }
        if ('retry' in options) {
            retry = mergeRetryOptions(retry || {}, options.retry);
        }
        if ('autoPaginate' in options && !options.autoPaginate) {
            autoPaginate = false;
        }
        if ('maxResults' in options) {
            maxResults = options.maxResults;
        }
        if ('otherArgs' in options) {
            otherArgs = {};
            for (const key in this.otherArgs) {
                otherArgs[key] = this.otherArgs[key];
            }
            for (const optionsKey in options.otherArgs) {
                otherArgs[optionsKey] = options.otherArgs[optionsKey];
            }
        }
        if ('isBundling' in options) {
            isBundling = options.isBundling;
        }
        if ('maxRetries' in options && options.maxRetries !== undefined) {
            retry.backoffSettings.maxRetries = options.maxRetries;
            delete retry.backoffSettings.totalTimeoutMillis;
        }
        if ('longrunning' in options) {
            longrunning = options.longrunning;
        }
        if ('apiName' in options) {
            apiName = options.apiName;
        }
        if ('retryRequestOptions' in options) {
            retryRequestOptions = options.retryRequestOptions;
        }
        return new CallSettings({
            timeout,
            retry,
            bundleOptions: this.bundleOptions,
            longrunning,
            autoPaginate,
            maxResults,
            otherArgs,
            isBundling,
            apiName,
            retryRequestOptions,
        });
    }
}
exports.CallSettings = CallSettings;
/**
 * Validates passed retry options in preparation for eventual parameter deprecation
 * converts retryRequestOptions to retryOptions
 * then sets retryRequestOptions to null
 *
 * @param {CallOptions} options - a list of passed retry option
 * @return {CallOptions} A new CallOptions object.
 *
 */
function convertRetryOptions(options, gaxStreamingRetries) {
    var _a, _b, _c, _d;
    // options will be undefined if no CallOptions object is passed at call time
    if (!options) {
        return options;
    }
    // if a user provided retry AND retryRequestOptions at call time, throw an error
    // otherwise, convert supported parameters
    if (!gaxStreamingRetries) {
        return options;
    }
    if (options.retry && options.retryRequestOptions) {
        throw new Error('Only one of retry or retryRequestOptions may be set');
    } // handles parameter conversion from retryRequestOptions to retryOptions
    if (options.retryRequestOptions) {
        if (options.retryRequestOptions.objectMode !== undefined) {
            (0, warnings_1.warn)('retry_request_options', 'objectMode override is not supported. It is set to true internally by default in gax.', 'UnsupportedParameterWarning');
        }
        if (options.retryRequestOptions.noResponseRetries !== undefined) {
            (0, warnings_1.warn)('retry_request_options', 'noResponseRetries override is not supported. Please specify retry codes or a function to determine retry eligibility.', 'UnsupportedParameterWarning');
        }
        if (options.retryRequestOptions.currentRetryAttempt !== undefined) {
            (0, warnings_1.warn)('retry_request_options', 'currentRetryAttempt override is not supported. Retry attempts are tracked internally.', 'UnsupportedParameterWarning');
        }
        let retryCodes = [status_1.Status.UNAVAILABLE];
        let shouldRetryFn;
        if (options.retryRequestOptions.shouldRetryFn) {
            retryCodes = [];
            shouldRetryFn = options.retryRequestOptions.shouldRetryFn;
        }
        //Backoff settings
        options.maxRetries =
            (_b = (_a = options === null || options === void 0 ? void 0 : options.retryRequestOptions) === null || _a === void 0 ? void 0 : _a.retries) !== null && _b !== void 0 ? _b : options.maxRetries;
        // create a default backoff settings object in case the user didn't provide overrides for everything
        const backoffSettings = createDefaultBackoffSettings();
        let maxRetryDelayMillis;
        let totalTimeoutMillis;
        // maxRetryDelay - this is in seconds, need to convert to milliseconds
        if (options.retryRequestOptions.maxRetryDelay !== undefined) {
            maxRetryDelayMillis = options.retryRequestOptions.maxRetryDelay * 1000;
        }
        // retryDelayMultiplier - should be a one to one mapping to retryDelayMultiplier
        const retryDelayMultiplier = (_d = (_c = options === null || options === void 0 ? void 0 : options.retryRequestOptions) === null || _c === void 0 ? void 0 : _c.retryDelayMultiplier) !== null && _d !== void 0 ? _d : backoffSettings.retryDelayMultiplier;
        // this is in seconds and needs to be converted to milliseconds and the totalTimeoutMillis parameter
        if (options.retryRequestOptions.totalTimeout !== undefined) {
            totalTimeoutMillis = options.retryRequestOptions.totalTimeout * 1000;
        }
        else {
            if (options.maxRetries === undefined) {
                totalTimeoutMillis = 30000;
                (0, warnings_1.warn)('retry_request_options_no_max_retries_timeout', 'Neither maxRetries nor totalTimeout were passed. Defaulting to totalTimeout of 30000ms.', 'MissingParameterWarning');
            }
        }
        // for the variables the user wants to override, override in the backoff settings object we made
        backoffSettings.maxRetryDelayMillis =
            maxRetryDelayMillis !== null && maxRetryDelayMillis !== void 0 ? maxRetryDelayMillis : backoffSettings.maxRetryDelayMillis;
        backoffSettings.retryDelayMultiplier =
            retryDelayMultiplier !== null && retryDelayMultiplier !== void 0 ? retryDelayMultiplier : backoffSettings.retryDelayMultiplier;
        backoffSettings.totalTimeoutMillis =
            totalTimeoutMillis !== null && totalTimeoutMillis !== void 0 ? totalTimeoutMillis : backoffSettings.totalTimeoutMillis;
        const convertedRetryOptions = createRetryOptions(retryCodes, backoffSettings, shouldRetryFn);
        options.retry = convertedRetryOptions;
        delete options.retryRequestOptions; // completely remove them to avoid any further confusion
        (0, warnings_1.warn)('retry_request_options', 'retryRequestOptions will be deprecated in a future release. Please use retryOptions to pass retry options at call time', 'DeprecationWarning');
    }
    return options;
}
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
function createRetryOptions(retryCodes, backoffSettings, shouldRetryFn, getResumptionRequestFn) {
    return {
        retryCodes,
        backoffSettings,
        shouldRetryFn,
        getResumptionRequestFn,
    };
}
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
function createBackoffSettings(initialRetryDelayMillis, retryDelayMultiplier, maxRetryDelayMillis, initialRpcTimeoutMillis, rpcTimeoutMultiplier, maxRpcTimeoutMillis, totalTimeoutMillis) {
    return {
        initialRetryDelayMillis,
        retryDelayMultiplier,
        maxRetryDelayMillis,
        initialRpcTimeoutMillis,
        rpcTimeoutMultiplier,
        maxRpcTimeoutMillis,
        totalTimeoutMillis,
    };
}
function createDefaultBackoffSettings() {
    return createBackoffSettings(100, 1.3, 60000, null, null, null, null);
}
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
function createMaxRetriesBackoffSettings(initialRetryDelayMillis, retryDelayMultiplier, maxRetryDelayMillis, initialRpcTimeoutMillis, rpcTimeoutMultiplier, maxRpcTimeoutMillis, maxRetries) {
    return {
        initialRetryDelayMillis,
        retryDelayMultiplier,
        maxRetryDelayMillis,
        initialRpcTimeoutMillis,
        rpcTimeoutMultiplier,
        maxRpcTimeoutMillis,
        maxRetries,
    };
}
/**
 * Creates a new {@link BundleOptions}.
 *
 * @private
 * @param {Object} options - An object to hold optional parameters. See
 *   properties for the content of options.
 * @return {BundleOptions} - A new options.
 */
function createBundleOptions(options) {
    const params = [
        'element_count_threshold',
        'element_count_limit',
        'request_byte_threshold',
        'request_byte_limit',
        'delay_threshold_millis',
    ];
    params.forEach(param => {
        if (param in options && typeof options[param] !== 'number') {
            throw new Error(`${param} should be a number`);
        }
    });
    const elementCountThreshold = options.element_count_threshold || 0;
    const elementCountLimit = options.element_count_limit || 0;
    const requestByteThreshold = options.request_byte_threshold || 0;
    const requestByteLimit = options.request_byte_limit || 0;
    const delayThreshold = options.delay_threshold_millis || 0;
    if (elementCountThreshold === 0 &&
        requestByteThreshold === 0 &&
        delayThreshold === 0) {
        throw new Error('one threshold should be > 0');
    }
    return {
        elementCountThreshold,
        elementCountLimit,
        requestByteThreshold,
        requestByteLimit,
        delayThreshold,
    };
}
/**
 * Helper for {@link constructSettings}
 *
 * @private
 *
 * @param {Object} methodConfig - A dictionary representing a single
 *   `methods` entry of the standard API client config file. (See
 *   {@link constructSettings} for information on this yaml.)
 * @param {?Object} retryCodes - A dictionary parsed from the
 *   `retry_codes_def` entry of the standard API client config
 *   file. (See {@link constructSettings} for information on this yaml.)
 * @param {Object} retryParams - A dictionary parsed from the
 *   `retry_params` entry of the standard API client config
 *   file. (See {@link constructSettings} for information on this yaml.)
 * @param {Object} retryNames - A dictionary mapping the string names
 *   used in the standard API client config file to API response
 *   status codes.
 * @return {?RetryOptions} The new retry options.
 */
function constructRetry(methodConfig, retryCodes, retryParams, retryNames) {
    if (!methodConfig) {
        return null;
    }
    let codes = null; // this is one instance where it will NOT be an array OR a function because we do not allow shouldRetryFn in the client
    if (retryCodes && 'retry_codes_name' in methodConfig) {
        const retryCodesName = methodConfig['retry_codes_name'];
        codes = (retryCodes[retryCodesName] || []).map(name => {
            return Number(retryNames[name]);
        });
    }
    let backoffSettings = null;
    if (retryParams && 'retry_params_name' in methodConfig) {
        const params = retryParams[methodConfig.retry_params_name];
        backoffSettings = createBackoffSettings(params.initial_retry_delay_millis, params.retry_delay_multiplier, params.max_retry_delay_millis, params.initial_rpc_timeout_millis, params.rpc_timeout_multiplier, params.max_rpc_timeout_millis, params.total_timeout_millis);
    }
    return createRetryOptions(codes, backoffSettings);
}
/**
 * Helper for {@link constructSettings}
 *
 * Takes two retry options, and merges them into a single RetryOption instance.
 *
 * @private
 *
 * @param {RetryOptions} retry - The base RetryOptions.
 * @param {RetryOptions} overrides - The RetryOptions used for overriding
 *   `retry`. Use the values if it is not null. If entire `overrides` is null,
 *   ignore the base retry and return null.
 * @return {?RetryOptions} The merged RetryOptions.
 */
function mergeRetryOptions(retry, overrides) {
    if (!overrides) {
        return null;
    }
    if (!overrides.retryCodes &&
        !overrides.backoffSettings &&
        !overrides.shouldRetryFn &&
        !overrides.getResumptionRequestFn) {
        return retry;
    }
    const retryCodes = overrides.retryCodes
        ? overrides.retryCodes
        : retry.retryCodes;
    const backoffSettings = overrides.backoffSettings
        ? overrides.backoffSettings
        : retry.backoffSettings;
    const shouldRetryFn = overrides.shouldRetryFn
        ? overrides.shouldRetryFn
        : retry.shouldRetryFn;
    const getResumptionRequestFn = overrides.getResumptionRequestFn
        ? overrides.getResumptionRequestFn
        : retry.getResumptionRequestFn;
    return createRetryOptions(retryCodes, backoffSettings, shouldRetryFn, getResumptionRequestFn);
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
function constructSettings(serviceName, clientConfig, configOverrides, retryNames, otherArgs) {
    otherArgs = otherArgs || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaults = {};
    const serviceConfig = (clientConfig.interfaces || {})[serviceName];
    if (!serviceConfig) {
        return null;
    }
    // users can override the config from client side, like bundling options.
    // The detailed structure of the clientConfig can be found here: https://github.com/googleapis/gax-nodejs/blob/main/src/gax.ts#L546
    // The way to override bundling options:
    //
    // const customConfig = {"interfaces": {"service": {"methods": {"methodName": {"bundling": {..}}}}}}
    // const client = new Client({ projectId, customConfig });
    const overrides = (configOverrides.interfaces || {})[serviceName] || {};
    const methods = serviceConfig.methods;
    const overridingMethods = overrides.methods || {};
    for (const methodName in methods) {
        const methodConfig = methods[methodName];
        const jsName = (0, util_1.toLowerCamelCase)(methodName);
        let retry = constructRetry(methodConfig, serviceConfig.retry_codes, serviceConfig.retry_params, retryNames);
        let bundlingConfig = methodConfig.bundling;
        let timeout = methodConfig.timeout_millis;
        if (methodName in overridingMethods) {
            const overridingMethod = overridingMethods[methodName];
            if (overridingMethod) {
                if ('bundling' in overridingMethod) {
                    bundlingConfig = overridingMethod.bundling;
                }
                if ('timeout_millis' in overridingMethod) {
                    timeout = overridingMethod.timeout_millis;
                }
            }
            retry = mergeRetryOptions(retry, constructRetry(overridingMethod, overrides.retry_codes, overrides.retry_params, retryNames));
        }
        const apiName = serviceName;
        defaults[jsName] = new CallSettings({
            timeout,
            retry,
            bundleOptions: bundlingConfig
                ? createBundleOptions(bundlingConfig)
                : null,
            otherArgs,
            apiName,
        });
    }
    return defaults;
}
function createByteLengthFunction(message) {
    return function getByteLength(obj) {
        try {
            return message.encode(obj).finish().length;
        }
        catch (err) {
            const stringified = JSON.stringify(obj);
            (0, warnings_1.warn)('error_encoding_protobufjs_object', `Cannot encode protobuf.js object: ${stringified}: ${err}`);
            // We failed to encode the object properly, let's just return an upper boundary of its length.
            // It's only needed for calculating the size of the batch, so it's safe if it's bigger than needed.
            return stringified.length;
        }
    };
}
//# sourceMappingURL=gax.js.map