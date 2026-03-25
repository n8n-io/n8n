"use strict";
/**
 * (C) Copyright IBM Corp. 2019, 2022.
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
exports.streamToPromise = void 0;
/**
 * Helper method that can be bound to a stream - it captures all of the results, and returns a promise that resolves to the final buffer
 * or array of text chunks
 * Essentially a smaller version of concat-stream wrapped in a promise
 *
 * @param stream - optional stream param for when not bound to an existing stream instance.
 * @returns Promise
 */
function streamToPromise(stream) {
    stream = stream || this;
    return new Promise(function (resolve, reject) {
        var results = [];
        stream
            .on('data', function (result) {
            results.push(result);
        })
            .on('end', function () {
            resolve(Buffer.isBuffer(results[0]) ? Buffer.concat(results) : results);
        })
            .on('error', reject);
    });
}
exports.streamToPromise = streamToPromise;
