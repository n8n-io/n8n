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
exports.StreamingApiCaller = void 0;
const warnings_1 = require("../warnings");
const streaming_1 = require("./streaming");
class StreamingApiCaller {
    /**
     * An API caller for methods of gRPC streaming.
     * @private
     * @constructor
     * @param {StreamDescriptor} descriptor - the descriptor of the method structure.
     */
    constructor(descriptor) {
        this.descriptor = descriptor;
    }
    init(callback) {
        return new streaming_1.StreamProxy(this.descriptor.type, callback, this.descriptor.rest, this.descriptor.gaxStreamingRetries);
    }
    wrap(func) {
        switch (this.descriptor.type) {
            case streaming_1.StreamType.SERVER_STREAMING:
                return (argument, metadata, options) => {
                    return func(argument, metadata, options);
                };
            case streaming_1.StreamType.CLIENT_STREAMING:
                return (argument, metadata, options, callback) => {
                    return func(metadata, options, callback);
                };
            case streaming_1.StreamType.BIDI_STREAMING:
                return (argument, metadata, options) => {
                    return func(metadata, options);
                };
            default:
                (0, warnings_1.warn)('streaming_wrap_unknown_stream_type', `Unknown stream type: ${this.descriptor.type}`);
        }
        return func;
    }
    call(apiCall, argument, settings, stream) {
        stream.setStream(apiCall, argument, settings.retryRequestOptions, settings.retry);
    }
    fail(stream, err) {
        stream.emit('error', err);
    }
    result(stream) {
        return stream;
    }
}
exports.StreamingApiCaller = StreamingApiCaller;
//# sourceMappingURL=streamingApiCaller.js.map