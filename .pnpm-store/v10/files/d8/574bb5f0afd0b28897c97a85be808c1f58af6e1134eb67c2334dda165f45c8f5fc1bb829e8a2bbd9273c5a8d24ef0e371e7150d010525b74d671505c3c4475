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
exports.addTimeoutArg = addTimeoutArg;
/**
 * Updates func so that it gets called with the timeout as its final arg.
 *
 * This converts a function, func, into another function with updated deadline.
 *
 * @private
 *
 * @param {GRPCCall} func - a function to be updated.
 * @param {number} timeout - to be added to the original function as it final
 *   positional arg.
 * @param {Object} otherArgs - the additional arguments to be passed to func.
 * @param {Object=} abTests - the A/B testing key/value pairs.
 * @return {function(Object, APICallback)}
 *  the function with other arguments and the timeout.
 */
function addTimeoutArg(func, timeout, otherArgs, abTests) {
    // TODO: this assumes the other arguments consist of metadata and options,
    // which is specific to gRPC calls. Remove the hidden dependency on gRPC.
    return (argument, callback) => {
        const now = new Date();
        const options = otherArgs.options || {};
        options.deadline = new Date(now.getTime() + timeout);
        const metadata = otherArgs.metadataBuilder
            ? otherArgs.metadataBuilder(abTests, otherArgs.headers || {})
            : null;
        return func(argument, metadata, options, callback);
    };
}
//# sourceMappingURL=timeout.js.map