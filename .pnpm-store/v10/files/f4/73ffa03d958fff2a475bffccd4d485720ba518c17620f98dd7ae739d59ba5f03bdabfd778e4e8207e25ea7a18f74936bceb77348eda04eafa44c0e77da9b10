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
import { APICallback, GRPCCall, SimpleCallbackFunction } from '../apitypes';
import { OngoingCall, OngoingCallPromise } from '../call';
import { CallSettings } from '../gax';
import { GoogleError } from '../googleError';
import { BundleExecutor } from './bundleExecutor';
/**
 * An implementation of APICaller for bundled calls.
 * Uses BundleExecutor to do bundling.
 */
export declare class BundleApiCaller implements APICaller {
    bundler: BundleExecutor;
    constructor(bundler: BundleExecutor);
    init(callback?: APICallback): OngoingCallPromise | OngoingCall;
    wrap(func: GRPCCall): GRPCCall;
    call(apiCall: SimpleCallbackFunction, argument: {}, settings: CallSettings, status: OngoingCallPromise): void;
    fail(canceller: OngoingCallPromise, err: GoogleError): void;
    result(canceller: OngoingCallPromise): import("../call").CancellablePromise<import("../apitypes").ResultTuple>;
}
