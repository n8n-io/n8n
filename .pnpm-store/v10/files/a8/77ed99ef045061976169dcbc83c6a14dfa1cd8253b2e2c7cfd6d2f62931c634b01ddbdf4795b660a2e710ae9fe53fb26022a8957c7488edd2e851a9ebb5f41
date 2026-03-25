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
exports.PagedApiCaller = void 0;
const call_1 = require("../call");
const googleError_1 = require("../googleError");
const resourceCollector_1 = require("./resourceCollector");
const warnings_1 = require(".././warnings");
class PagedApiCaller {
    /**
     * Creates an API caller that returns a stream to performs page-streaming.
     *
     * @private
     * @constructor
     * @param {PageDescriptor} pageDescriptor - indicates the structure
     *   of page streaming to be performed.
     */
    constructor(pageDescriptor) {
        this.pageDescriptor = pageDescriptor;
    }
    /**
     * This function translates between regular gRPC calls (that accepts a request and returns a response,
     * and does not know anything about pages and page tokens) and the users' callback (that expects
     * to see resources from one page, a request to get the next page, and the raw response from the server).
     *
     * It generates a function that can be passed as a callback function to a gRPC call, will understand
     * pagination-specific fields in the response, and call the users' callback after having those fields
     * parsed.
     *
     * @param request Request object. It needs to be passed to all subsequent next page requests
     * (the main content of the request object stays unchanged, only the next page token changes)
     * @param callback The user's callback that expects the page content, next page request, and raw response.
     */
    generateParseResponseCallback(request, callback) {
        const resourceFieldName = this.pageDescriptor.resourceField;
        const responsePageTokenFieldName = this.pageDescriptor.responsePageTokenField;
        const requestPageTokenFieldName = this.pageDescriptor.requestPageTokenField;
        return (err, response) => {
            if (err) {
                callback(err);
                return;
            }
            if (!request) {
                callback(new googleError_1.GoogleError('Undefined request in pagination method callback.'));
                return;
            }
            if (!response) {
                callback(new googleError_1.GoogleError('Undefined response in pagination method callback.'));
                return;
            }
            const resources = response[resourceFieldName] || [];
            const pageToken = response[responsePageTokenFieldName];
            let nextPageRequest = null;
            if (pageToken) {
                nextPageRequest = Object.assign({}, request);
                nextPageRequest[requestPageTokenFieldName] = pageToken;
            }
            callback(err, resources, nextPageRequest, response);
        };
    }
    /**
     * Adds a special ability to understand pagination-specific fields to the existing gRPC call.
     * The original gRPC call just calls callback(err, result).
     * The wrapped one will call callback(err, resources, nextPageRequest, rawResponse) instead.
     *
     * @param func gRPC call (normally, a service stub call). The gRPC call is expected to accept four parameters:
     * request, metadata, call options, and callback.
     */
    wrap(func) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        return function wrappedCall(argument, metadata, options, callback) {
            return func(argument, metadata, options, self.generateParseResponseCallback(argument, callback));
        };
    }
    /**
     * Makes it possible to use both callback-based and promise-based calls.
     * Returns an OngoingCall or OngoingCallPromise object.
     * Regardless of which one is returned, it always has a `.callback` to call.
     *
     * @param settings Call settings. Can only be used to replace Promise with another promise implementation.
     * @param [callback] Callback to be called, if any.
     */
    init(callback) {
        if (callback) {
            return new call_1.OngoingCall(callback);
        }
        return new call_1.OngoingCallPromise();
    }
    /**
     * Implements auto-pagination logic.
     *
     * @param apiCall A function that performs gRPC request and calls its callback with a response or an error.
     * It's supposed to be a gRPC service stub function wrapped into several layers of wrappers that make it
     * accept just two parameters: (request, callback).
     * @param request A request object that came from the user.
     * @param settings Call settings. We are interested in `maxResults` and `autoPaginate` (they are optional).
     * @param ongoingCall An instance of OngoingCall or OngoingCallPromise that can be used for call cancellation,
     * and is used to return results to the user.
     */
    call(apiCall, request, settings, ongoingCall) {
        request = Object.assign({}, request);
        if (!settings.autoPaginate) {
            // they don't want auto-pagination this time - okay, just call once
            ongoingCall.call(apiCall, request);
            return;
        }
        if (request.pageSize && settings.autoPaginate) {
            (0, warnings_1.warn)('autoPaginate true', 'Providing a pageSize without setting autoPaginate to false will still return all results. See https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#auto-pagination for more information on how to configure manual paging', 'AutopaginateTrueWarning');
        }
        const maxResults = settings.maxResults || -1;
        const resourceCollector = new resourceCollector_1.ResourceCollector(apiCall, maxResults);
        resourceCollector.processAllPages(request).then(resources => ongoingCall.callback(null, resources), err => ongoingCall.callback(err));
    }
    fail(ongoingCall, err) {
        ongoingCall.callback(err);
    }
    result(ongoingCall) {
        return ongoingCall.promise;
    }
}
exports.PagedApiCaller = PagedApiCaller;
//# sourceMappingURL=pagedApiCaller.js.map