"use strict";
/**
 * Copyright 2021 Google LLC
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
exports.StreamArrayParser = void 0;
const abort_controller_1 = require("abort-controller");
const stream_1 = require("stream");
const fallbackRest_1 = require("./fallbackRest");
const featureDetection_1 = require("./featureDetection");
class StreamArrayParser extends stream_1.Transform {
    /**
     * StreamArrayParser processes array of valid JSON objects in random chunks
     * through readable stream, and produces a stream of plain Javascript objects
     * where it converted from the corresponding protobuf message instance.
     *
     * The default JSON parser decodes the input stream under the
     * following rules:
     *  1. The stream represents a valid JSON array (must start with a "[" and
     * close with the corresponding "]"). Each element of this array is assumed to
     * be either an array or an object, and will be decoded as a JS object and
     *    delivered.
     *  2. All JSON elements in the buffer will be decoded and delivered in a
     * stream.
     *
     * @private
     * @constructor
     * @param {protobuf.Method} rpc - the protobuf method produce array of JSON.
     * @param {Object} options - the options pass to Transform Stream. See more
     * details
     * https://nodejs.org/api/stream.html#stream_new_stream_transform_options.
     */
    constructor(rpc, options) {
        super(Object.assign({}, options, { readableObjectMode: true }));
        this._done = false;
        this._prevBlock = Buffer.from('');
        this._isInString = false;
        this._isSkipped = false;
        this._level = 0;
        this.rpc = rpc;
        this.cancelController = (0, featureDetection_1.hasAbortController)()
            ? new AbortController()
            : new abort_controller_1.AbortController();
        this.cancelSignal = this.cancelController.signal;
        this.cancelRequested = false;
    }
    _transform(chunk, _, callback) {
        let objectStart = 0;
        let curIndex = 0;
        if (this._level === 0 && curIndex === 0) {
            if (String.fromCharCode(chunk[0]) !== '[') {
                this.emit('error', new Error(`Internal Error: API service stream data must start with a '[' and close with the corresponding ']', but it start with ${String.fromCharCode(chunk[0])}`));
            }
            curIndex++;
            this._level++;
        }
        while (curIndex < chunk.length) {
            const curValue = String.fromCharCode(chunk[curIndex]);
            if (!this._isSkipped) {
                switch (curValue) {
                    case '{':
                        // Check if it's in string, we ignore the curly brace in string.
                        // Otherwise the object level++.
                        if (!this._isInString) {
                            this._level++;
                        }
                        if (!this._isInString && this._level === 2) {
                            objectStart = curIndex;
                        }
                        break;
                    case '"':
                        // Flip the string status
                        this._isInString = !this._isInString;
                        break;
                    case '}':
                        // check if it's in string
                        // if true, do nothing
                        // if false and level = 0, push data
                        if (!this._isInString) {
                            this._level--;
                        }
                        if (!this._isInString && this._level === 1) {
                            // find a object
                            const objBuff = Buffer.concat([
                                this._prevBlock,
                                chunk.slice(objectStart, curIndex + 1),
                            ]);
                            try {
                                // HTTP response.ok is true.
                                const msgObj = (0, fallbackRest_1.decodeResponse)(this.rpc, true, objBuff);
                                this.push(msgObj);
                            }
                            catch (err) {
                                this.emit('error', err);
                            }
                            objectStart = curIndex + 1;
                            this._prevBlock = Buffer.from('');
                        }
                        break;
                    case ']':
                        if (!this._isInString && this._level === 1) {
                            this._done = true;
                            this.push(null);
                        }
                        break;
                    case '\\':
                        // Escaping escape character.
                        this._isSkipped = true;
                        break;
                    default:
                        break;
                }
            }
            else {
                this._isSkipped = false;
            }
            curIndex++;
        }
        if (this._level > 1) {
            this._prevBlock = Buffer.concat([
                this._prevBlock,
                chunk.slice(objectStart, curIndex),
            ]);
        }
        callback();
    }
    _flush(callback) {
        callback();
    }
    cancel() {
        this._done = true;
        this.cancelRequested = true;
        this.cancelController.abort();
        this.end();
    }
}
exports.StreamArrayParser = StreamArrayParser;
//# sourceMappingURL=streamArrayParser.js.map