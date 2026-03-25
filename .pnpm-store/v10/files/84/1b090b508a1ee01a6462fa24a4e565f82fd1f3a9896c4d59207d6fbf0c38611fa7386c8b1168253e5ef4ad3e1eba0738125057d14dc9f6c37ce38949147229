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
exports.StreamDescriptor = void 0;
const streamingApiCaller_1 = require("./streamingApiCaller");
/**
 * A descriptor for streaming calls.
 */
class StreamDescriptor {
    constructor(streamType, rest, gaxStreamingRetries) {
        this.type = streamType;
        this.streaming = true;
        this.rest = rest;
        this.gaxStreamingRetries = gaxStreamingRetries;
    }
    getApiCaller() {
        // Right now retrying does not work with gRPC-streaming, because retryable
        // assumes an API call returns an event emitter while gRPC-streaming methods
        // return Stream.
        return new streamingApiCaller_1.StreamingApiCaller(this);
    }
}
exports.StreamDescriptor = StreamDescriptor;
//# sourceMappingURL=streamDescriptor.js.map