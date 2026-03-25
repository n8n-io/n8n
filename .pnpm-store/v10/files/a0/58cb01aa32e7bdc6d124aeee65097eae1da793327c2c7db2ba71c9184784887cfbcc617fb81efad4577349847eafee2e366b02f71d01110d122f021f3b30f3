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
exports.Task = void 0;
exports.deepCopyForResponse = deepCopyForResponse;
const status_1 = require("../status");
const googleError_1 = require("../googleError");
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
function deepCopyForResponse(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
obj, subresponseInfo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result;
    if (obj === null) {
        return null;
    }
    if (obj === undefined) {
        return undefined;
    }
    if (Array.isArray(obj)) {
        result = [];
        obj.forEach(element => {
            result.push(deepCopyForResponse(element, null));
        });
        return result;
    }
    // Some objects (such as ByteBuffer) have copy method.
    if (obj.copy !== undefined) {
        return obj.copy();
    }
    // ArrayBuffer should be copied through slice().
    if (obj instanceof ArrayBuffer) {
        return obj.slice(0);
    }
    if (typeof obj === 'object') {
        result = {};
        Object.keys(obj).forEach(key => {
            if (subresponseInfo &&
                key === subresponseInfo.field &&
                Array.isArray(obj[key])) {
                // Note that subresponses are not deep-copied. This is safe because
                // those subresponses are not shared among callbacks.
                result[key] = obj[key].slice(subresponseInfo.start, subresponseInfo.end);
            }
            else {
                result[key] = deepCopyForResponse(obj[key], null);
            }
        });
        return result;
    }
    return obj;
}
class Task {
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
    constructor(apiCall, bundlingRequest, bundledField, subresponseField) {
        this._apiCall = apiCall;
        this._request = bundlingRequest;
        this._bundledField = bundledField;
        this._subresponseField = subresponseField;
        this._data = [];
    }
    /**
     * Returns the number of elements in a task.
     * @return {number} The number of elements.
     */
    getElementCount() {
        let count = 0;
        for (let i = 0; i < this._data.length; ++i) {
            count += this._data[i].elements.length;
        }
        return count;
    }
    /**
     * Returns the total byte size of the elements in a task.
     * @return {number} The byte size.
     */
    getRequestByteSize() {
        let size = 0;
        for (let i = 0; i < this._data.length; ++i) {
            size += this._data[i].bytes;
        }
        return size;
    }
    /**
     * Invokes the actual API call with current elements.
     * @return {string[]} - the list of ids for invocations to be run.
     */
    run() {
        if (this._data.length === 0) {
            return [];
        }
        const request = this._request;
        const elements = [];
        const ids = [];
        for (let i = 0; i < this._data.length; ++i) {
            elements.push(...this._data[i].elements);
            ids.push(this._data[i].callback.id);
        }
        request[this._bundledField] = elements;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.callCanceller = this._apiCall(request, (err, response) => {
            const responses = [];
            if (err) {
                self._data.forEach(() => {
                    responses.push(undefined);
                });
            }
            else {
                let subresponseInfo = null;
                if (self._subresponseField) {
                    subresponseInfo = {
                        field: self._subresponseField,
                        start: 0,
                    };
                }
                self._data.forEach(data => {
                    if (subresponseInfo) {
                        subresponseInfo.end =
                            subresponseInfo.start + data.elements.length;
                    }
                    responses.push(deepCopyForResponse(response, subresponseInfo));
                    if (subresponseInfo) {
                        subresponseInfo.start = subresponseInfo.end;
                    }
                });
            }
            for (let i = 0; i < self._data.length; ++i) {
                if (self._data[i].cancelled) {
                    const error = new googleError_1.GoogleError('cancelled');
                    error.code = status_1.Status.CANCELLED;
                    self._data[i].callback(error);
                }
                else {
                    self._data[i].callback(err, responses[i]);
                }
            }
        });
        return ids;
    }
    /**
     * Appends the list of elements into the task.
     * @param {Object[]} elements - the new list of elements.
     * @param {number} bytes - the byte size required to encode elements in the API.
     * @param {APICallback} callback - the callback of the method call.
     */
    extend(elements, bytes, callback) {
        this._data.push({
            elements,
            bytes,
            callback,
        });
    }
    /**
     * Cancels a part of elements.
     * @param {string} id - The identifier of the part of elements.
     * @return {boolean} Whether the entire task will be canceled or not.
     */
    cancel(id) {
        if (this.callCanceller) {
            let allCancelled = true;
            this._data.forEach(d => {
                if (d.callback.id === id) {
                    d.cancelled = true;
                }
                if (!d.cancelled) {
                    allCancelled = false;
                }
            });
            if (allCancelled) {
                this.callCanceller.cancel();
            }
            return allCancelled;
        }
        for (let i = 0; i < this._data.length; ++i) {
            if (this._data[i].callback.id === id) {
                const error = new googleError_1.GoogleError('cancelled');
                error.code = status_1.Status.CANCELLED;
                this._data[i].callback(error);
                this._data.splice(i, 1);
                break;
            }
        }
        return this._data.length === 0;
    }
}
exports.Task = Task;
//# sourceMappingURL=task.js.map