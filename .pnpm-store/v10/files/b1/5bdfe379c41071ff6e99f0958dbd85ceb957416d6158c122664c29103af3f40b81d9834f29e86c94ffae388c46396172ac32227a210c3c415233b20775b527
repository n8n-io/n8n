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
import { APICallback, RequestType, ResultTuple, SimpleCallbackFunction } from './apitypes';
export declare class OngoingCall {
    callback: APICallback;
    cancelFunc?: () => void;
    completed: boolean;
    /**
     * OngoingCall manages callback, API calls, and cancellation
     * of the API calls.
     * @param {APICallback=} callback
     *   The callback to be called asynchronously when the API call
     *   finishes.
     * @constructor
     * @property {APICallback} callback
     *   The callback function to be called.
     * @private
     */
    constructor(callback: APICallback);
    /**
     * Cancels the ongoing promise.
     */
    cancel(): void;
    /**
     * Call calls the specified function. Result will be used to fulfill
     * the promise.
     *
     * @param {SimpleCallbackFunction} func
     *   A function for an API call.
     * @param {Object} argument
     *   A request object.
     */
    call(func: SimpleCallbackFunction, argument: RequestType): void;
}
export interface CancellablePromise<T> extends Promise<T> {
    cancel(): void;
}
export declare class OngoingCallPromise extends OngoingCall {
    promise: CancellablePromise<ResultTuple>;
    /**
     * GaxPromise is GRPCCallbackWrapper, but it holds a promise when
     * the API call finishes.
     * @constructor
     * @private
     */
    constructor();
}
