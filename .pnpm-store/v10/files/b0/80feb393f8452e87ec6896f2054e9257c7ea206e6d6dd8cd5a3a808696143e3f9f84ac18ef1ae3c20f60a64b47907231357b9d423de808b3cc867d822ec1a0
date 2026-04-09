"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTracerProvider = void 0;
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
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const propagator_b3_1 = require("@opentelemetry/propagator-b3");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const semver = require("semver");
const propagator_jaeger_1 = require("@opentelemetry/propagator-jaeger");
/**
 * Register this TracerProvider for use with the OpenTelemetry API.
 * Undefined values may be replaced with defaults, and
 * null values will be skipped.
 *
 * @param config Configuration object for SDK registration
 */
class NodeTracerProvider extends sdk_trace_base_1.BasicTracerProvider {
    constructor(config = {}) {
        super(config);
    }
    register(config = {}) {
        if (config.contextManager === undefined) {
            const ContextManager = semver.gte(process.version, '14.8.0')
                ? context_async_hooks_1.AsyncLocalStorageContextManager
                : context_async_hooks_1.AsyncHooksContextManager;
            config.contextManager = new ContextManager();
            config.contextManager.enable();
        }
        super.register(config);
    }
}
exports.NodeTracerProvider = NodeTracerProvider;
NodeTracerProvider._registeredPropagators = new Map([
    ...sdk_trace_base_1.BasicTracerProvider._registeredPropagators,
    [
        'b3',
        () => new propagator_b3_1.B3Propagator({ injectEncoding: propagator_b3_1.B3InjectEncoding.SINGLE_HEADER }),
    ],
    [
        'b3multi',
        () => new propagator_b3_1.B3Propagator({ injectEncoding: propagator_b3_1.B3InjectEncoding.MULTI_HEADER }),
    ],
    ['jaeger', () => new propagator_jaeger_1.JaegerPropagator()],
]);
//# sourceMappingURL=NodeTracerProvider.js.map