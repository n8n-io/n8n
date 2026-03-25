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
import { SimpleCallbackFunction } from '../apitypes';
import { BundleDescriptor } from './bundleDescriptor';
import { Task, TaskCallback } from './task';
/**
 * Parameter to configure bundling behavior.
 * @typedef {Object} BundleOptions
 * @property {number} elementCountThreshold -
 *   the bundled request will be sent once the count of outstanding elements
 *   in the repeated field reaches this value.
 * @property {number} elementCountLimit -
 *   represents a hard limit on the number of elements in the repeated field
 *   of the bundle; if adding a request to a bundle would exceed this value,
 *   the bundle is sent and the new request is added to a fresh bundle. It is
 *   invalid for a single request to exceed this limit.
 * @property {number} requestByteThreshold -
 *   the bundled request will be sent once the count of bytes in the request
 *   reaches this value. Note that this value is pessimistically approximated
 *   by summing the bytesizes of the elements in the repeated field, and
 *   therefore may be an under-approximation.
 * @property {number} requestByteLimit -
 *   represents a hard limit on the size of the bundled request; if adding
 *   a request to a bundle would exceed this value, the bundle is sent and
 *   the new request is added to a fresh bundle. It is invalid for a single
 *   request to exceed this limit. Note that this value is pessimistically
 *   approximated by summing the bytesizes of the elements in the repeated
 *   field, with a buffer applied to correspond to the resulting
 *   under-approximation.
 * @property {number} delayThreshold -
 *   the bundled request will be sent this amount of time after the first
 *   element in the bundle was added to it.
 */
export interface BundleOptions {
    elementCountLimit?: number;
    requestByteLimit?: number;
    elementCountThreshold?: number;
    requestByteThreshold?: number;
    delayThreshold?: number;
}
/**
 * BundleExecutor stores several timers for each bundle (calls are bundled based
 * on the options passed, each bundle has unique ID that is calculated based on
 * field values). Each timer fires and sends a call after certain amount of
 * time, and if a new request comes to the same bundle, the timer can be
 * restarted.
 */
export declare class BundleExecutor {
    _options: BundleOptions;
    _descriptor: BundleDescriptor;
    _tasks: {
        [index: string]: Task;
    };
    _timers: {
        [index: string]: ReturnType<typeof setTimeout>;
    };
    _invocations: {
        [index: string]: string;
    };
    _invocationId: number;
    /**
     * Organizes requests for an api service that requires to bundle them.
     *
     * @param {BundleOptions} bundleOptions - configures strategy this instance
     *   uses when executing bundled functions.
     * @param {BundleDescriptor} bundleDescriptor - the description of the bundling.
     * @constructor
     */
    constructor(bundleOptions: BundleOptions, bundleDescriptor: BundleDescriptor);
    /**
     * Schedule a method call.
     *
     * @param {function} apiCall - the function for an API call.
     * @param {Object} request - the request object to be bundled with others.
     * @param {APICallback} callback - the callback to be called when the method finished.
     * @return {function()} - the function to cancel the scheduled invocation.
     */
    schedule(apiCall: SimpleCallbackFunction, request: {
        [index: string]: Array<{}> | string;
    }, callback?: TaskCallback): import("../apitypes").GRPCCallResult;
    /**
     * Clears scheduled timeout if it exists.
     *
     * @param {String} bundleId - the id for the task whose timeout needs to be
     *   cleared.
     * @private
     */
    private _maybeClearTimeout;
    /**
     * Cancels an event.
     *
     * @param {String} id - The id for the event in the task.
     * @private
     */
    private _cancel;
    /**
     * Invokes a task.
     *
     * @param {String} bundleId - The id for the task.
     * @private
     */
    _runNow(bundleId: string): void;
}
