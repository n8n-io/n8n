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
exports.BasicTracerProvider = exports.ForceFlushState = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const resources_1 = require("@opentelemetry/resources");
const _1 = require(".");
const config_1 = require("./config");
const MultiSpanProcessor_1 = require("./MultiSpanProcessor");
const NoopSpanProcessor_1 = require("./export/NoopSpanProcessor");
const platform_1 = require("./platform");
const utility_1 = require("./utility");
var ForceFlushState;
(function (ForceFlushState) {
    ForceFlushState[ForceFlushState["resolved"] = 0] = "resolved";
    ForceFlushState[ForceFlushState["timeout"] = 1] = "timeout";
    ForceFlushState[ForceFlushState["error"] = 2] = "error";
    ForceFlushState[ForceFlushState["unresolved"] = 3] = "unresolved";
})(ForceFlushState = exports.ForceFlushState || (exports.ForceFlushState = {}));
/**
 * This class represents a basic tracer provider which platform libraries can extend
 */
class BasicTracerProvider {
    constructor(config = {}) {
        var _a;
        this._registeredSpanProcessors = [];
        this._tracers = new Map();
        const mergedConfig = (0, core_1.merge)({}, (0, config_1.loadDefaultConfig)(), (0, utility_1.reconfigureLimits)(config));
        this.resource = (_a = mergedConfig.resource) !== null && _a !== void 0 ? _a : resources_1.Resource.empty();
        this.resource = resources_1.Resource.default().merge(this.resource);
        this._config = Object.assign({}, mergedConfig, {
            resource: this.resource,
        });
        const defaultExporter = this._buildExporterFromEnv();
        if (defaultExporter !== undefined) {
            const batchProcessor = new platform_1.BatchSpanProcessor(defaultExporter);
            this.activeSpanProcessor = batchProcessor;
        }
        else {
            this.activeSpanProcessor = new NoopSpanProcessor_1.NoopSpanProcessor();
        }
    }
    getTracer(name, version, options) {
        const key = `${name}@${version || ''}:${(options === null || options === void 0 ? void 0 : options.schemaUrl) || ''}`;
        if (!this._tracers.has(key)) {
            this._tracers.set(key, new _1.Tracer({ name, version, schemaUrl: options === null || options === void 0 ? void 0 : options.schemaUrl }, this._config, this));
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._tracers.get(key);
    }
    /**
     * Adds a new {@link SpanProcessor} to this tracer.
     * @param spanProcessor the new SpanProcessor to be added.
     */
    addSpanProcessor(spanProcessor) {
        if (this._registeredSpanProcessors.length === 0) {
            // since we might have enabled by default a batchProcessor, we disable it
            // before adding the new one
            this.activeSpanProcessor
                .shutdown()
                .catch(err => api_1.diag.error('Error while trying to shutdown current span processor', err));
        }
        this._registeredSpanProcessors.push(spanProcessor);
        this.activeSpanProcessor = new MultiSpanProcessor_1.MultiSpanProcessor(this._registeredSpanProcessors);
    }
    getActiveSpanProcessor() {
        return this.activeSpanProcessor;
    }
    /**
     * Register this TracerProvider for use with the OpenTelemetry API.
     * Undefined values may be replaced with defaults, and
     * null values will be skipped.
     *
     * @param config Configuration object for SDK registration
     */
    register(config = {}) {
        api_1.trace.setGlobalTracerProvider(this);
        if (config.propagator === undefined) {
            config.propagator = this._buildPropagatorFromEnv();
        }
        if (config.contextManager) {
            api_1.context.setGlobalContextManager(config.contextManager);
        }
        if (config.propagator) {
            api_1.propagation.setGlobalPropagator(config.propagator);
        }
    }
    forceFlush() {
        const timeout = this._config.forceFlushTimeoutMillis;
        const promises = this._registeredSpanProcessors.map((spanProcessor) => {
            return new Promise(resolve => {
                let state;
                const timeoutInterval = setTimeout(() => {
                    resolve(new Error(`Span processor did not completed within timeout period of ${timeout} ms`));
                    state = ForceFlushState.timeout;
                }, timeout);
                spanProcessor
                    .forceFlush()
                    .then(() => {
                    clearTimeout(timeoutInterval);
                    if (state !== ForceFlushState.timeout) {
                        state = ForceFlushState.resolved;
                        resolve(state);
                    }
                })
                    .catch(error => {
                    clearTimeout(timeoutInterval);
                    state = ForceFlushState.error;
                    resolve(error);
                });
            });
        });
        return new Promise((resolve, reject) => {
            Promise.all(promises)
                .then(results => {
                const errors = results.filter(result => result !== ForceFlushState.resolved);
                if (errors.length > 0) {
                    reject(errors);
                }
                else {
                    resolve();
                }
            })
                .catch(error => reject([error]));
        });
    }
    shutdown() {
        return this.activeSpanProcessor.shutdown();
    }
    /**
     * TS cannot yet infer the type of this.constructor:
     * https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
     * There is no need to override either of the getters in your child class.
     * The type of the registered component maps should be the same across all
     * classes in the inheritance tree.
     */
    _getPropagator(name) {
        var _a;
        return (_a = this.constructor._registeredPropagators.get(name)) === null || _a === void 0 ? void 0 : _a();
    }
    _getSpanExporter(name) {
        var _a;
        return (_a = this.constructor._registeredExporters.get(name)) === null || _a === void 0 ? void 0 : _a();
    }
    _buildPropagatorFromEnv() {
        // per spec, propagators from env must be deduplicated
        const uniquePropagatorNames = Array.from(new Set((0, core_1.getEnv)().OTEL_PROPAGATORS));
        const propagators = uniquePropagatorNames.map(name => {
            const propagator = this._getPropagator(name);
            if (!propagator) {
                api_1.diag.warn(`Propagator "${name}" requested through environment variable is unavailable.`);
            }
            return propagator;
        });
        const validPropagators = propagators.reduce((list, item) => {
            if (item) {
                list.push(item);
            }
            return list;
        }, []);
        if (validPropagators.length === 0) {
            return;
        }
        else if (uniquePropagatorNames.length === 1) {
            return validPropagators[0];
        }
        else {
            return new core_1.CompositePropagator({
                propagators: validPropagators,
            });
        }
    }
    _buildExporterFromEnv() {
        const exporterName = (0, core_1.getEnv)().OTEL_TRACES_EXPORTER;
        if (exporterName === 'none' || exporterName === '')
            return;
        const exporter = this._getSpanExporter(exporterName);
        if (!exporter) {
            api_1.diag.error(`Exporter "${exporterName}" requested through environment variable is unavailable.`);
        }
        return exporter;
    }
}
exports.BasicTracerProvider = BasicTracerProvider;
BasicTracerProvider._registeredPropagators = new Map([
    ['tracecontext', () => new core_1.W3CTraceContextPropagator()],
    ['baggage', () => new core_1.W3CBaggagePropagator()],
]);
BasicTracerProvider._registeredExporters = new Map();
//# sourceMappingURL=BasicTracerProvider.js.map