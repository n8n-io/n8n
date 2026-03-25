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
exports.createApiCall = createApiCall;
/**
 * Provides function wrappers that implement page streaming and retrying.
 */
const apiCaller_1 = require("./apiCaller");
const gax_1 = require("./gax");
const retries_1 = require("./normalCalls/retries");
const timeout_1 = require("./normalCalls/timeout");
const streamingApiCaller_1 = require("./streamingCalls/streamingApiCaller");
const warnings_1 = require("./warnings");
/**
 * Converts an rpc call into an API call governed by the settings.
 *
 * In typical usage, `func` will be a promise to a callable used to make an rpc
 * request. This will mostly likely be a bound method from a request stub used
 * to make an rpc call. It is not a direct function but a Promise instance,
 * because of its asynchronism (typically, obtaining the auth information).
 *
 * The result is a function which manages the API call with the given settings
 * and the options on the invocation.
 *
 * @param {Promise<GRPCCall>|GRPCCall} func - is either a promise to be used to make
 *   a bare RPC call, or just a bare RPC call.
 * @param {CallSettings} settings - provides the settings for this call
 * @param {Descriptor} descriptor - optionally specify the descriptor for
 *   the method call.
 * @return {GaxCall} func - a bound method on a request stub used
 *   to make an rpc call.
 */
function createApiCall(func, settings, descriptor, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_fallback // unused here, used in fallback.ts implementation
) {
    // we want to be able to accept both promise resolving to a function and a
    // function. Currently client librares are only calling this method with a
    // promise, but it will change.
    const funcPromise = typeof func === 'function' ? Promise.resolve(func) : func;
    // the following apiCaller will be used for all calls of this function...
    const apiCaller = (0, apiCaller_1.createAPICaller)(settings, descriptor);
    return (request, callOptions, callback) => {
        var _a, _b;
        let currentApiCaller = apiCaller;
        let thisSettings;
        if (currentApiCaller instanceof streamingApiCaller_1.StreamingApiCaller) {
            const gaxStreamingRetries = (_b = (_a = currentApiCaller.descriptor) === null || _a === void 0 ? void 0 : _a.gaxStreamingRetries) !== null && _b !== void 0 ? _b : false;
            // If Gax streaming retries are enabled, check settings passed at call time and convert parameters if needed
            const convertedRetryOptions = (0, gax_1.convertRetryOptions)(callOptions, gaxStreamingRetries);
            thisSettings = settings.merge(convertedRetryOptions);
        }
        else {
            thisSettings = settings.merge(callOptions);
        }
        // special case: if bundling is disabled for this one call,
        // use default API caller instead
        if (settings.isBundling && !thisSettings.isBundling) {
            currentApiCaller = (0, apiCaller_1.createAPICaller)(settings, undefined);
        }
        const ongoingCall = currentApiCaller.init(callback);
        funcPromise
            .then((func) => {
            var _a, _b;
            var _c;
            // Initially, the function is just what gRPC server stub contains.
            func = currentApiCaller.wrap(func);
            const streaming = (_a = currentApiCaller.descriptor) === null || _a === void 0 ? void 0 : _a.streaming;
            const retry = thisSettings.retry;
            if (streaming && retry) {
                if (retry.retryCodes.length > 0 && retry.shouldRetryFn) {
                    (0, warnings_1.warn)('either_retrycodes_or_shouldretryfn', 'Only one of retryCodes or shouldRetryFn may be defined. Ignoring retryCodes.');
                    retry.retryCodes = [];
                }
                if (!currentApiCaller.descriptor
                    .gaxStreamingRetries &&
                    retry.getResumptionRequestFn) {
                    throw new Error('getResumptionRequestFn can only be used when gaxStreamingRetries is set to true.');
                }
            }
            if (!streaming && retry) {
                if (retry.shouldRetryFn) {
                    throw new Error('Using a function to determine retry eligibility is only supported with server streaming calls');
                }
                if (retry.getResumptionRequestFn) {
                    throw new Error('Resumption strategy can only be used with server streaming retries');
                }
                if (retry.retryCodes && retry.retryCodes.length > 0) {
                    (_b = (_c = retry.backoffSettings).initialRpcTimeoutMillis) !== null && _b !== void 0 ? _b : (_c.initialRpcTimeoutMillis = thisSettings.timeout);
                    return (0, retries_1.retryable)(func, thisSettings.retry, thisSettings.otherArgs, thisSettings.apiName);
                }
            }
            return (0, timeout_1.addTimeoutArg)(func, thisSettings.timeout, thisSettings.otherArgs);
        })
            .then((apiCall) => {
            // After adding retries / timeouts, the call function becomes simpler:
            // it only accepts request and callback.
            currentApiCaller.call(apiCall, request, thisSettings, ongoingCall);
        })
            .catch(err => {
            currentApiCaller.fail(ongoingCall, err);
        });
        // Calls normally return a "cancellable promise" that can be used to `await` for the actual result,
        // or to cancel the ongoing call.
        return currentApiCaller.result(ongoingCall);
    };
}
//# sourceMappingURL=createApiCall.js.map