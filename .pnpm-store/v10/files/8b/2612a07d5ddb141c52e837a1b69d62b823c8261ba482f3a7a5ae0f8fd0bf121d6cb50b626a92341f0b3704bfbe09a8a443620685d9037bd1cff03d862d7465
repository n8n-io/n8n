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
exports.OngoingCallPromise = exports.OngoingCall = void 0;
const status_1 = require("./status");
const googleError_1 = require("./googleError");
class OngoingCall {
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
    constructor(callback) {
        this.callback = callback;
        this.completed = false;
    }
    /**
     * Cancels the ongoing promise.
     */
    cancel() {
        if (this.completed) {
            return;
        }
        this.completed = true;
        if (this.cancelFunc) {
            this.cancelFunc();
        }
        else {
            const error = new googleError_1.GoogleError('cancelled');
            error.code = status_1.Status.CANCELLED;
            this.callback(error);
        }
    }
    /**
     * Call calls the specified function. Result will be used to fulfill
     * the promise.
     *
     * @param {SimpleCallbackFunction} func
     *   A function for an API call.
     * @param {Object} argument
     *   A request object.
     */
    call(func, argument) {
        if (this.completed) {
            return;
        }
        const canceller = func(argument, (err, response, next, rawResponse) => {
            this.completed = true;
            setImmediate(this.callback, err, response, next, rawResponse);
        });
        if (canceller instanceof Promise) {
            canceller.catch(err => {
                setImmediate(this.callback, new googleError_1.GoogleError(err), null, null, null);
            });
        }
        this.cancelFunc = () => canceller.cancel();
    }
}
exports.OngoingCall = OngoingCall;
class OngoingCallPromise extends OngoingCall {
    /**
     * GaxPromise is GRPCCallbackWrapper, but it holds a promise when
     * the API call finishes.
     * @constructor
     * @private
     */
    constructor() {
        let resolveCallback;
        let rejectCallback;
        const callback = (err, response, next, rawResponse) => {
            if (err) {
                // If gRPC metadata exist, parsed google.rpc.status details.
                if (err.metadata) {
                    rejectCallback(googleError_1.GoogleError.parseGRPCStatusDetails(err));
                }
                else {
                    rejectCallback(err);
                }
            }
            else if (response !== undefined) {
                resolveCallback([response, next || null, rawResponse || null]);
            }
            else {
                throw new googleError_1.GoogleError('Neither error nor response are defined');
            }
        };
        const promise = new Promise((resolve, reject) => {
            resolveCallback = resolve;
            rejectCallback = reject;
        });
        super(callback);
        this.promise = promise;
        this.promise.cancel = () => {
            this.cancel();
        };
    }
}
exports.OngoingCallPromise = OngoingCallPromise;
//# sourceMappingURL=call.js.map