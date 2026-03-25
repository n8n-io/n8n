"use strict";
/*!
 * Copyright 2019 Google Inc. All Rights Reserved.
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
exports.ResourceStream = void 0;
const stream_1 = require("stream");
class ResourceStream extends stream_1.Transform {
    constructor(args, requestFn) {
        const options = Object.assign({ objectMode: true }, args.streamOptions);
        super(options);
        this._ended = false;
        this._maxApiCalls = args.maxApiCalls === -1 ? Infinity : args.maxApiCalls;
        this._nextQuery = args.query;
        this._reading = false;
        this._requestFn = requestFn;
        this._requestsMade = 0;
        this._resultsToSend = args.maxResults === -1 ? Infinity : args.maxResults;
        this._otherArgs = [];
    }
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    end(...args) {
        this._ended = true;
        return super.end(...args);
    }
    _read() {
        if (this._reading) {
            return;
        }
        this._reading = true;
        // Wrap in a try/catch to catch input linting errors, e.g.
        // an invalid BigQuery query. These errors are thrown in an
        // async fashion, which makes them un-catchable by the user.
        try {
            this._requestFn(this._nextQuery, (err, results, nextQuery, ...otherArgs) => {
                if (err) {
                    this.destroy(err);
                    return;
                }
                this._otherArgs = otherArgs;
                this._nextQuery = nextQuery;
                if (this._resultsToSend !== Infinity) {
                    results = results.splice(0, this._resultsToSend);
                    this._resultsToSend -= results.length;
                }
                let more = true;
                for (const result of results) {
                    if (this._ended) {
                        break;
                    }
                    more = this.push(result);
                }
                const isFinished = !this._nextQuery || this._resultsToSend < 1;
                const madeMaxCalls = ++this._requestsMade >= this._maxApiCalls;
                if (isFinished || madeMaxCalls) {
                    this.end();
                }
                if (more && !this._ended) {
                    setImmediate(() => this._read());
                }
                this._reading = false;
            });
        }
        catch (e) {
            this.destroy(e);
        }
    }
}
exports.ResourceStream = ResourceStream;
//# sourceMappingURL=resource-stream.js.map