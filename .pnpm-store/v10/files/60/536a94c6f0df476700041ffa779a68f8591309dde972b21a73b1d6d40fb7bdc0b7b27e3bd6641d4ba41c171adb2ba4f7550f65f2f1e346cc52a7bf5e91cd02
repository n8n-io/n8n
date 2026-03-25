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
import { AbortController as NodeAbortController } from 'abort-controller';
import { Transform } from 'stream';
export declare class StreamArrayParser extends Transform {
    private _done;
    private _prevBlock;
    private _isInString;
    private _isSkipped;
    private _level;
    rpc: protobuf.Method;
    cancelController: AbortController | NodeAbortController;
    cancelSignal: AbortSignal;
    cancelRequested: boolean;
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
    constructor(rpc: protobuf.Method, options?: {});
    _transform(chunk: Buffer, _: string, callback: Function): void;
    _flush(callback: Function): void;
    cancel(): void;
}
