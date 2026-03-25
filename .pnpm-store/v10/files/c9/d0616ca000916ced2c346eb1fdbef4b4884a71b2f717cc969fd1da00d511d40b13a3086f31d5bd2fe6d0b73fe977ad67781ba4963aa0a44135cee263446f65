"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LruMemoizerInstrumentation = void 0;
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
/** @knipignore */
const version_1 = require("./version");
class LruMemoizerInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('lru-memoizer', ['>=1.3 <3'], moduleExports => {
                // moduleExports is a function which receives an options object,
                // and returns a "memoizer" function upon invocation.
                // We want to patch this "memoizer's" internal function
                const asyncMemoizer = function () {
                    // This following function is invoked every time the user wants to get a (possible) memoized value
                    // We replace it with another function in which we bind the current context to the last argument (callback)
                    const origMemoizer = moduleExports.apply(this, arguments);
                    return function () {
                        const modifiedArguments = [...arguments];
                        // last argument is the callback
                        const origCallback = modifiedArguments.pop();
                        const callbackWithContext = typeof origCallback === 'function'
                            ? api_1.context.bind(api_1.context.active(), origCallback)
                            : origCallback;
                        modifiedArguments.push(callbackWithContext);
                        return origMemoizer.apply(this, modifiedArguments);
                    };
                };
                // sync function preserves context, but we still need to export it
                // as the lru-memoizer package does
                asyncMemoizer.sync = moduleExports.sync;
                return asyncMemoizer;
            }, undefined // no need to disable as this instrumentation does not create any spans
            ),
        ];
    }
}
exports.LruMemoizerInstrumentation = LruMemoizerInstrumentation;
//# sourceMappingURL=instrumentation.js.map