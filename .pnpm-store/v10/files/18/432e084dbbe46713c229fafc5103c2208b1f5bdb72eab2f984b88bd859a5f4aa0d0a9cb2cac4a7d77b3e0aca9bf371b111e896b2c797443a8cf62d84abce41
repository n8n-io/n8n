"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisInstrumentation = void 0;
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
const instrumentation_1 = require("@opentelemetry/instrumentation");
/** @knipignore */
const version_1 = require("./version");
const instrumentation_2 = require("./v2-v3/instrumentation");
const instrumentation_3 = require("./v4-v5/instrumentation");
const DEFAULT_CONFIG = {
    requireParentSpan: false,
};
// Wrapper RedisInstrumentation that address all supported versions
class RedisInstrumentation extends instrumentation_1.InstrumentationBase {
    instrumentationV2_V3;
    instrumentationV4_V5;
    // this is used to bypass a flaw in the base class constructor, which is calling
    // member functions before the constructor has a chance to fully initialize the member variables.
    initialized = false;
    constructor(config = {}) {
        const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, resolvedConfig);
        this.instrumentationV2_V3 = new instrumentation_2.RedisInstrumentationV2_V3(this.getConfig());
        this.instrumentationV4_V5 = new instrumentation_3.RedisInstrumentationV4_V5(this.getConfig());
        this.initialized = true;
    }
    setConfig(config = {}) {
        const newConfig = { ...DEFAULT_CONFIG, ...config };
        super.setConfig(newConfig);
        if (!this.initialized) {
            return;
        }
        this.instrumentationV2_V3.setConfig(newConfig);
        this.instrumentationV4_V5.setConfig(newConfig);
    }
    init() { }
    // Return underlying modules, as consumers (like https://github.com/DrewCorlin/opentelemetry-node-bundler-plugins) may
    // expect them to be populated without knowing that this module wraps 2 instrumentations
    getModuleDefinitions() {
        return [
            ...this.instrumentationV2_V3.getModuleDefinitions(),
            ...this.instrumentationV4_V5.getModuleDefinitions(),
        ];
    }
    setTracerProvider(tracerProvider) {
        super.setTracerProvider(tracerProvider);
        if (!this.initialized) {
            return;
        }
        this.instrumentationV2_V3.setTracerProvider(tracerProvider);
        this.instrumentationV4_V5.setTracerProvider(tracerProvider);
    }
    enable() {
        super.enable();
        if (!this.initialized) {
            return;
        }
        this.instrumentationV2_V3.enable();
        this.instrumentationV4_V5.enable();
    }
    disable() {
        super.disable();
        if (!this.initialized) {
            return;
        }
        this.instrumentationV2_V3.disable();
        this.instrumentationV4_V5.disable();
    }
}
exports.RedisInstrumentation = RedisInstrumentation;
//# sourceMappingURL=redis.js.map