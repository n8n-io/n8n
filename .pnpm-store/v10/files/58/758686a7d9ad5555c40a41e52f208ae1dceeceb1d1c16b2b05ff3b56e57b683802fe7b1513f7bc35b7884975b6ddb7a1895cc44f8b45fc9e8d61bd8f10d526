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
exports.PageDescriptor = void 0;
const stream_1 = require("stream");
const normalApiCaller_1 = require("../normalCalls/normalApiCaller");
const warnings_1 = require(".././warnings");
const pagedApiCaller_1 = require("./pagedApiCaller");
const maxAttemptsEmptyResponse = 10;
/**
 * A descriptor for methods that support pagination.
 */
class PageDescriptor {
    constructor(requestPageTokenField, responsePageTokenField, resourceField) {
        this.requestPageTokenField = requestPageTokenField;
        this.responsePageTokenField = responsePageTokenField;
        this.resourceField = resourceField;
    }
    /**
     * Creates a new object Stream which emits the resource on 'data' event.
     */
    createStream(apiCall, request, options) {
        if (options === null || options === void 0 ? void 0 : options.autoPaginate) {
            (0, warnings_1.warn)('autoPaginate true', 'Autopaginate will always be set to false in stream paging methods. See more info at https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#auto-pagination for more information on how to configure paging calls', 'AutopaginateTrueWarning');
        }
        const stream = new stream_1.PassThrough({ objectMode: true });
        options = Object.assign({}, options, { autoPaginate: false });
        const maxResults = 'maxResults' in options ? options.maxResults : -1;
        let pushCount = 0;
        let started = false;
        function callback(err, resources, next, apiResp) {
            if (err) {
                stream.emit('error', err);
                return;
            }
            // emit full api response with every page.
            stream.emit('response', apiResp);
            for (let i = 0; i < resources.length; ++i) {
                // TODO: rewrite without accessing stream internals
                if (stream
                    ._readableState.ended) {
                    return;
                }
                if (resources[i] === null) {
                    continue;
                }
                stream.push(resources[i]);
                pushCount++;
                if (pushCount === maxResults) {
                    stream.end();
                }
            }
            // TODO: rewrite without accessing stream internals
            if (stream._readableState
                .ended) {
                return;
            }
            if (!next) {
                stream.end();
                return;
            }
            // When pageToken is specified in the original options, it will overwrite
            // the page token field in the next request. Therefore it must be cleared.
            if ('pageToken' in options) {
                delete options.pageToken;
            }
            if (stream.isPaused()) {
                request = next;
                started = false;
            }
            else {
                setImmediate(apiCall, next, options, callback);
            }
        }
        stream.on('resume', () => {
            if (!started) {
                started = true;
                apiCall(request, options, callback);
            }
        });
        return stream;
    }
    /**
     * Create an async iterable which can be recursively called for data on-demand.
     */
    asyncIterate(apiCall, request, options) {
        if (options === null || options === void 0 ? void 0 : options.autoPaginate) {
            (0, warnings_1.warn)('autoPaginate true', 'Autopaginate will always be set to false in Async paging methods. See more info at https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#auto-pagination for more information on how to configure paging calls', 'AutopaginateTrueWarning');
        }
        options = Object.assign({}, options, { autoPaginate: false });
        const iterable = this.createIterator(apiCall, request, options);
        return iterable;
    }
    createIterator(apiCall, request, options) {
        const asyncIterable = {
            [Symbol.asyncIterator]() {
                let nextPageRequest = request;
                const cache = [];
                return {
                    async next() {
                        if (cache.length > 0) {
                            return Promise.resolve({
                                done: false,
                                value: cache.shift(),
                            });
                        }
                        let attempts = 0;
                        while (cache.length === 0 && nextPageRequest) {
                            let result;
                            [result, nextPageRequest] = (await apiCall(nextPageRequest, options));
                            // For pagination response with protobuf map type, use tuple as representation.
                            if (result && !Array.isArray(result)) {
                                for (const [key, value] of Object.entries(result)) {
                                    cache.push([key, value]);
                                }
                            }
                            else {
                                cache.push(...result);
                            }
                            if (cache.length === 0) {
                                ++attempts;
                                if (attempts > maxAttemptsEmptyResponse) {
                                    break;
                                }
                            }
                        }
                        if (cache.length === 0) {
                            return Promise.resolve({ done: true, value: undefined });
                        }
                        return Promise.resolve({ done: false, value: cache.shift() });
                    },
                };
            },
        };
        return asyncIterable;
    }
    getApiCaller(settings) {
        if (!settings.autoPaginate) {
            return new normalApiCaller_1.NormalApiCaller();
        }
        return new pagedApiCaller_1.PagedApiCaller(this);
    }
}
exports.PageDescriptor = PageDescriptor;
//# sourceMappingURL=pageDescriptor.js.map