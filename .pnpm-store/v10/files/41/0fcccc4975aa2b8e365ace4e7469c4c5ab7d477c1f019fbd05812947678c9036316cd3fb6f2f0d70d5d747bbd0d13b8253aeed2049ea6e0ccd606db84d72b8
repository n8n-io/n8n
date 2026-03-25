"use strict";
/*!
 * Copyright 2015 Google Inc. All Rights Reserved.
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
exports.ResourceStream = exports.paginator = exports.Paginator = void 0;
/*!
 * @module common/paginator
 */
const arrify = require("arrify");
const extend = require("extend");
const resource_stream_1 = require("./resource-stream");
Object.defineProperty(exports, "ResourceStream", { enumerable: true, get: function () { return resource_stream_1.ResourceStream; } });
/*! Developer Documentation
 *
 * paginator is used to auto-paginate `nextQuery` methods as well as
 * streamifying them.
 *
 * Before:
 *
 *   search.query('done=true', function(err, results, nextQuery) {
 *     search.query(nextQuery, function(err, results, nextQuery) {});
 *   });
 *
 * After:
 *
 *   search.query('done=true', function(err, results) {});
 *
 * Methods to extend should be written to accept callbacks and return a
 * `nextQuery`.
 */
class Paginator {
    /**
     * Cache the original method, then overwrite it on the Class's prototype.
     *
     * @param {function} Class - The parent class of the methods to extend.
     * @param {string|string[]} methodNames - Name(s) of the methods to extend.
     */
    // tslint:disable-next-line:variable-name
    extend(Class, methodNames) {
        methodNames = arrify(methodNames);
        methodNames.forEach(methodName => {
            const originalMethod = Class.prototype[methodName];
            // map the original method to a private member
            Class.prototype[methodName + '_'] = originalMethod;
            // overwrite the original to auto-paginate
            /* eslint-disable  @typescript-eslint/no-explicit-any */
            Class.prototype[methodName] = function (...args) {
                const parsedArguments = paginator.parseArguments_(args);
                return paginator.run_(parsedArguments, originalMethod.bind(this));
            };
        });
    }
    /**
     * Wraps paginated API calls in a readable object stream.
     *
     * This method simply calls the nextQuery recursively, emitting results to a
     * stream. The stream ends when `nextQuery` is null.
     *
     * `maxResults` will act as a cap for how many results are fetched and emitted
     * to the stream.
     *
     * @param {string} methodName - Name of the method to streamify.
     * @return {function} - Wrapped function.
     */
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    streamify(methodName) {
        return function (
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        ...args) {
            const parsedArguments = paginator.parseArguments_(args);
            const originalMethod = this[methodName + '_'] || this[methodName];
            return paginator.runAsStream_(parsedArguments, originalMethod.bind(this));
        };
    }
    /**
     * Parse a pseudo-array `arguments` for a query and callback.
     *
     * @param {array} args - The original `arguments` pseduo-array that the original
     *     method received.
     */
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    parseArguments_(args) {
        let query;
        let autoPaginate = true;
        let maxApiCalls = -1;
        let maxResults = -1;
        let callback;
        const firstArgument = args[0];
        const lastArgument = args[args.length - 1];
        if (typeof firstArgument === 'function') {
            callback = firstArgument;
        }
        else {
            query = firstArgument;
        }
        if (typeof lastArgument === 'function') {
            callback = lastArgument;
        }
        if (typeof query === 'object') {
            query = extend(true, {}, query);
            // Check if the user only asked for a certain amount of results.
            if (query.maxResults && typeof query.maxResults === 'number') {
                // `maxResults` is used API-wide.
                maxResults = query.maxResults;
            }
            else if (typeof query.pageSize === 'number') {
                // `pageSize` is Pub/Sub's `maxResults`.
                maxResults = query.pageSize;
            }
            if (query.maxApiCalls && typeof query.maxApiCalls === 'number') {
                maxApiCalls = query.maxApiCalls;
                delete query.maxApiCalls;
            }
            // maxResults is the user specified limit.
            if (maxResults !== -1 || query.autoPaginate === false) {
                autoPaginate = false;
            }
        }
        const parsedArguments = {
            query: query || {},
            autoPaginate,
            maxApiCalls,
            maxResults,
            callback,
        };
        parsedArguments.streamOptions = extend(true, {}, parsedArguments.query);
        delete parsedArguments.streamOptions.autoPaginate;
        delete parsedArguments.streamOptions.maxResults;
        delete parsedArguments.streamOptions.pageSize;
        return parsedArguments;
    }
    /**
     * This simply checks to see if `autoPaginate` is set or not, if it's true
     * then we buffer all results, otherwise simply call the original method.
     *
     * @param {array} parsedArguments - Parsed arguments from the original method
     *     call.
     * @param {object=|string=} parsedArguments.query - Query object. This is most
     *     commonly an object, but to make the API more simple, it can also be a
     *     string in some places.
     * @param {function=} parsedArguments.callback - Callback function.
     * @param {boolean} parsedArguments.autoPaginate - Auto-pagination enabled.
     * @param {boolean} parsedArguments.maxApiCalls - Maximum API calls to make.
     * @param {number} parsedArguments.maxResults - Maximum results to return.
     * @param {function} originalMethod - The cached method that accepts a callback
     *     and returns `nextQuery` to receive more results.
     */
    run_(parsedArguments, originalMethod) {
        const query = parsedArguments.query;
        const callback = parsedArguments.callback;
        if (!parsedArguments.autoPaginate) {
            return originalMethod(query, callback);
        }
        const results = new Array();
        let otherArgs = [];
        const promise = new Promise((resolve, reject) => {
            const stream = paginator.runAsStream_(parsedArguments, originalMethod);
            stream
                .on('error', reject)
                .on('data', (data) => results.push(data))
                .on('end', () => {
                otherArgs = stream._otherArgs || [];
                resolve(results);
            });
        });
        if (!callback) {
            return promise.then(results => [results, query, ...otherArgs]);
        }
        promise.then(results => callback(null, results, query, ...otherArgs), (err) => callback(err));
    }
    /**
     * This method simply calls the nextQuery recursively, emitting results to a
     * stream. The stream ends when `nextQuery` is null.
     *
     * `maxResults` will act as a cap for how many results are fetched and emitted
     * to the stream.
     *
     * @param {object=|string=} parsedArguments.query - Query object. This is most
     *     commonly an object, but to make the API more simple, it can also be a
     *     string in some places.
     * @param {function=} parsedArguments.callback - Callback function.
     * @param {boolean} parsedArguments.autoPaginate - Auto-pagination enabled.
     * @param {boolean} parsedArguments.maxApiCalls - Maximum API calls to make.
     * @param {number} parsedArguments.maxResults - Maximum results to return.
     * @param {function} originalMethod - The cached method that accepts a callback
     *     and returns `nextQuery` to receive more results.
     * @return {stream} - Readable object stream.
     */
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    runAsStream_(parsedArguments, originalMethod) {
        return new resource_stream_1.ResourceStream(parsedArguments, originalMethod);
    }
}
exports.Paginator = Paginator;
const paginator = new Paginator();
exports.paginator = paginator;
//# sourceMappingURL=index.js.map