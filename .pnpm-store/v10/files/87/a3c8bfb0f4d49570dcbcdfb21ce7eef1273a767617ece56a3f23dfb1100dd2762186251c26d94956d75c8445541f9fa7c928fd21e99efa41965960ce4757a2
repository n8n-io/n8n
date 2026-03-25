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
exports.LongrunningApiCaller = void 0;
const call_1 = require("../call");
const gax_1 = require("../gax");
const longrunning_1 = require("./longrunning");
class LongrunningApiCaller {
    /**
     * Creates an API caller that performs polling on a long running operation.
     *
     * @private
     * @constructor
     * @param {LongRunningDescriptor} longrunningDescriptor - Holds the
     * decoders used for unpacking responses and the operationsClient
     * used for polling the operation.
     */
    constructor(longrunningDescriptor) {
        this.longrunningDescriptor = longrunningDescriptor;
    }
    init(callback) {
        if (callback) {
            return new call_1.OngoingCall(callback);
        }
        return new call_1.OngoingCallPromise();
    }
    wrap(func) {
        return func;
    }
    call(apiCall, argument, settings, canceller) {
        canceller.call((argument, callback) => {
            return this._wrapOperation(apiCall, settings, argument, callback);
        }, argument);
    }
    _wrapOperation(apiCall, settings, argument, callback) {
        let backoffSettings = settings.longrunning;
        if (!backoffSettings) {
            backoffSettings = (0, gax_1.createDefaultBackoffSettings)();
        }
        const longrunningDescriptor = this.longrunningDescriptor;
        return apiCall(argument, (err, rawResponse) => {
            if (err) {
                callback(err, null, null, rawResponse);
                return;
            }
            const operation = new longrunning_1.Operation(rawResponse, longrunningDescriptor, backoffSettings, settings);
            callback(null, operation, rawResponse);
        });
    }
    fail(canceller, err) {
        canceller.callback(err);
    }
    result(canceller) {
        return canceller.promise;
    }
}
exports.LongrunningApiCaller = LongrunningApiCaller;
//# sourceMappingURL=longRunningApiCaller.js.map