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
import { APICaller } from '../apiCaller';
import { APICallback, CancellableStream, GRPCCall, SimpleCallbackFunction } from '../apitypes';
import { StreamDescriptor } from './streamDescriptor';
import { StreamProxy } from './streaming';
import { CallSettings } from '../gax';
export declare class StreamingApiCaller implements APICaller {
    descriptor: StreamDescriptor;
    /**
     * An API caller for methods of gRPC streaming.
     * @private
     * @constructor
     * @param {StreamDescriptor} descriptor - the descriptor of the method structure.
     */
    constructor(descriptor: StreamDescriptor);
    init(callback: APICallback): StreamProxy;
    wrap(func: GRPCCall): GRPCCall;
    call(apiCall: SimpleCallbackFunction, argument: {}, settings: CallSettings, stream: StreamProxy): void;
    fail(stream: CancellableStream, err: Error): void;
    result(stream: CancellableStream): CancellableStream;
}
