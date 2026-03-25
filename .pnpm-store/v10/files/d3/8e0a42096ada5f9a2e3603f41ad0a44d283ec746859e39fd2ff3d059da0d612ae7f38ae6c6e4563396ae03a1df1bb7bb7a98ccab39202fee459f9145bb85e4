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
/// <reference types="node" />
import { TransformOptions } from 'stream';
import { ResourceStream } from './resource-stream';
export interface ParsedArguments extends TransformOptions {
    /**
     * Query object. This is most commonly an object, but to make the API more
     * simple, it can also be a string in some places.
     */
    query?: ParsedArguments;
    /**
     * Callback function.
     */
    callback?: Function;
    /**
     * Auto-pagination enabled.
     */
    autoPaginate?: boolean;
    /**
     * Maximum API calls to make.
     */
    maxApiCalls?: number;
    /**
     * Maximum results to return.
     */
    maxResults?: number;
    pageSize?: number;
    streamOptions?: ParsedArguments;
}
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
export declare class Paginator {
    /**
     * Cache the original method, then overwrite it on the Class's prototype.
     *
     * @param {function} Class - The parent class of the methods to extend.
     * @param {string|string[]} methodNames - Name(s) of the methods to extend.
     */
    extend(Class: Function, methodNames: string | string[]): void;
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
    streamify<T = any>(methodName: string): (this: {
        [index: string]: Function;
    }, ...args: any[]) => ResourceStream<T>;
    /**
     * Parse a pseudo-array `arguments` for a query and callback.
     *
     * @param {array} args - The original `arguments` pseduo-array that the original
     *     method received.
     */
    parseArguments_(args: any[]): ParsedArguments;
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
    run_(parsedArguments: ParsedArguments, originalMethod: Function): any;
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
    runAsStream_<T = any>(parsedArguments: ParsedArguments, originalMethod: Function): ResourceStream<T>;
}
declare const paginator: Paginator;
export { paginator };
export { ResourceStream };
