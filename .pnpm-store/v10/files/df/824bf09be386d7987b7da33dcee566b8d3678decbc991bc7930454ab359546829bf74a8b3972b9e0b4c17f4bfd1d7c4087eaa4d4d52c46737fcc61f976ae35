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
import { APICallback, GRPCCallResult, SimpleCallbackFunction } from '../apitypes';
export interface SubResponseInfo {
    field: string;
    start?: number;
    end?: number;
}
export interface TaskData {
    elements: {}[];
    bytes: number;
    callback: TaskCallback;
    cancelled?: boolean;
}
export interface TaskCallback extends APICallback {
    id?: string;
}
/**
 * Creates a deep copy of the object with the consideration of subresponse
 * fields for bundling.
 *
 * @param {Object} obj - The source object.
 * @param {Object?} subresponseInfo - The information to copy the subset of
 *   the field for the response. Do nothing if it's null.
 * @param {String} subresponseInfo.field - The field name.
 * @param {number} subresponseInfo.start - The offset where the copying
 *   element should starts with.
 * @param {number} subresponseInfo.end - The ending index where the copying
 *   region of the elements ends.
 * @return {Object} The copied object.
 * @private
 */
export declare function deepCopyForResponse(obj: any, subresponseInfo: SubResponseInfo | null): any;
export declare class Task {
    _apiCall: SimpleCallbackFunction;
    _request: {
        [index: string]: {}[];
    };
    _bundledField: string;
    _subresponseField?: string | null;
    _data: TaskData[];
    callCanceller?: GRPCCallResult;
    /**
     * A task coordinates the execution of a single bundle.
     *
     * @param {function} apiCall - The function to conduct calling API.
     * @param {Object} bundlingRequest - The base request object to be used
     *   for the actual API call.
     * @param {string} bundledField - The name of the field in bundlingRequest
     *   to be bundled.
     * @param {string=} subresponseField - The name of the field in the response
     *   to be passed to the callback.
     * @constructor
     * @private
     */
    constructor(apiCall: SimpleCallbackFunction, bundlingRequest: {}, bundledField: string, subresponseField?: string | null);
    /**
     * Returns the number of elements in a task.
     * @return {number} The number of elements.
     */
    getElementCount(): number;
    /**
     * Returns the total byte size of the elements in a task.
     * @return {number} The byte size.
     */
    getRequestByteSize(): number;
    /**
     * Invokes the actual API call with current elements.
     * @return {string[]} - the list of ids for invocations to be run.
     */
    run(): string[];
    /**
     * Appends the list of elements into the task.
     * @param {Object[]} elements - the new list of elements.
     * @param {number} bytes - the byte size required to encode elements in the API.
     * @param {APICallback} callback - the callback of the method call.
     */
    extend(elements: {}[], bytes: number, callback: TaskCallback): void;
    /**
     * Cancels a part of elements.
     * @param {string} id - The identifier of the part of elements.
     * @return {boolean} Whether the entire task will be canceled or not.
     */
    cancel(id: string): boolean;
}
