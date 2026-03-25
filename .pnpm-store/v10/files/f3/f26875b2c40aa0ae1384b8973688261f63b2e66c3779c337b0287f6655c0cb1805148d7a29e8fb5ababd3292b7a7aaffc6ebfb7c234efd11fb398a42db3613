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
exports.BundleApiCaller = void 0;
const call_1 = require("../call");
const googleError_1 = require("../googleError");
/**
 * An implementation of APICaller for bundled calls.
 * Uses BundleExecutor to do bundling.
 */
class BundleApiCaller {
    constructor(bundler) {
        this.bundler = bundler;
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
    call(apiCall, argument, settings, status) {
        if (!settings.isBundling) {
            throw new googleError_1.GoogleError('Bundling enabled with no isBundling!');
        }
        status.call((argument, callback) => {
            this.bundler.schedule(apiCall, argument, callback);
            return status;
        }, argument);
    }
    fail(canceller, err) {
        canceller.callback(err);
    }
    result(canceller) {
        return canceller.promise;
    }
}
exports.BundleApiCaller = BundleApiCaller;
//# sourceMappingURL=bundleApiCaller.js.map