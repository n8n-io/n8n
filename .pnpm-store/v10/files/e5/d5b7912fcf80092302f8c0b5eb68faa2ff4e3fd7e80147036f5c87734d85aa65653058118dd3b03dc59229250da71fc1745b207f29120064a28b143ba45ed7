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
import { context, diag, propagation, trace, } from '@opentelemetry/api';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator, getEnv, merge, } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { Tracer } from '.';
import { loadDefaultConfig } from './config';
import { MultiSpanProcessor } from './MultiSpanProcessor';
import { NoopSpanProcessor } from './export/NoopSpanProcessor';
import { BatchSpanProcessor } from './platform';
import { reconfigureLimits } from './utility';
export var ForceFlushState;
(function (ForceFlushState) {
    ForceFlushState[ForceFlushState["resolved"] = 0] = "resolved";
    ForceFlushState[ForceFlushState["timeout"] = 1] = "timeout";
    ForceFlushState[ForceFlushState["error"] = 2] = "error";
    ForceFlushState[ForceFlushState["unresolved"] = 3] = "unresolved";
})(ForceFlushState || (ForceFlushState = {}));
/**
 * This class represents a basic tracer provider which platform libraries can extend
 */
var BasicTracerProvider = /** @class */ (function () {
    function BasicTracerProvider(config) {
        if (config === void 0) { config = {}; }
        var _a;
        this._registeredSpanProcessors = [];
        this._tracers = new Map();
        var mergedConfig = merge({}, loadDefaultConfig(), reconfigureLimits(config));
        this.resource = (_a = mergedConfig.resource) !== null && _a !== void 0 ? _a : Resource.empty();
        this.resource = Resource.default().merge(this.resource);
        this._config = Object.assign({}, mergedConfig, {
            resource: this.resource,
        });
        var defaultExporter = this._buildExporterFromEnv();
        if (defaultExporter !== undefined) {
            var batchProcessor = new BatchSpanProcessor(defaultExporter);
            this.activeSpanProcessor = batchProcessor;
        }
        else {
            this.activeSpanProcessor = new NoopSpanProcessor();
        }
    }
    BasicTracerProvider.prototype.getTracer = function (name, version, options) {
        var key = name + "@" + (version || '') + ":" + ((options === null || options === void 0 ? void 0 : options.schemaUrl) || '');
        if (!this._tracers.has(key)) {
            this._tracers.set(key, new Tracer({ name: name, version: version, schemaUrl: options === null || options === void 0 ? void 0 : options.schemaUrl }, this._config, this));
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._tracers.get(key);
    };
    /**
     * Adds a new {@link SpanProcessor} to this tracer.
     * @param spanProcessor the new SpanProcessor to be added.
     */
    BasicTracerProvider.prototype.addSpanProcessor = function (spanProcessor) {
        if (this._registeredSpanProcessors.length === 0) {
            // since we might have enabled by default a batchProcessor, we disable it
            // before adding the new one
            this.activeSpanProcessor
                .shutdown()
                .catch(function (err) {
                return diag.error('Error while trying to shutdown current span processor', err);
            });
        }
        this._registeredSpanProcessors.push(spanProcessor);
        this.activeSpanProcessor = new MultiSpanProcessor(this._registeredSpanProcessors);
    };
    BasicTracerProvider.prototype.getActiveSpanProcessor = function () {
        return this.activeSpanProcessor;
    };
    /**
     * Register this TracerProvider for use with the OpenTelemetry API.
     * Undefined values may be replaced with defaults, and
     * null values will be skipped.
     *
     * @param config Configuration object for SDK registration
     */
    BasicTracerProvider.prototype.register = function (config) {
        if (config === void 0) { config = {}; }
        trace.setGlobalTracerProvider(this);
        if (config.propagator === undefined) {
            config.propagator = this._buildPropagatorFromEnv();
        }
        if (config.contextManager) {
            context.setGlobalContextManager(config.contextManager);
        }
        if (config.propagator) {
            propagation.setGlobalPropagator(config.propagator);
        }
    };
    BasicTracerProvider.prototype.forceFlush = function () {
        var timeout = this._config.forceFlushTimeoutMillis;
        var promises = this._registeredSpanProcessors.map(function (spanProcessor) {
            return new Promise(function (resolve) {
                var state;
                var timeoutInterval = setTimeout(function () {
                    resolve(new Error("Span processor did not completed within timeout period of " + timeout + " ms"));
                    state = ForceFlushState.timeout;
                }, timeout);
                spanProcessor
                    .forceFlush()
                    .then(function () {
                    clearTimeout(timeoutInterval);
                    if (state !== ForceFlushState.timeout) {
                        state = ForceFlushState.resolved;
                        resolve(state);
                    }
                })
                    .catch(function (error) {
                    clearTimeout(timeoutInterval);
                    state = ForceFlushState.error;
                    resolve(error);
                });
            });
        });
        return new Promise(function (resolve, reject) {
            Promise.all(promises)
                .then(function (results) {
                var errors = results.filter(function (result) { return result !== ForceFlushState.resolved; });
                if (errors.length > 0) {
                    reject(errors);
                }
                else {
                    resolve();
                }
            })
                .catch(function (error) { return reject([error]); });
        });
    };
    BasicTracerProvider.prototype.shutdown = function () {
        return this.activeSpanProcessor.shutdown();
    };
    /**
     * TS cannot yet infer the type of this.constructor:
     * https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
     * There is no need to override either of the getters in your child class.
     * The type of the registered component maps should be the same across all
     * classes in the inheritance tree.
     */
    BasicTracerProvider.prototype._getPropagator = function (name) {
        var _a;
        return (_a = this.constructor._registeredPropagators.get(name)) === null || _a === void 0 ? void 0 : _a();
    };
    BasicTracerProvider.prototype._getSpanExporter = function (name) {
        var _a;
        return (_a = this.constructor._registeredExporters.get(name)) === null || _a === void 0 ? void 0 : _a();
    };
    BasicTracerProvider.prototype._buildPropagatorFromEnv = function () {
        var _this = this;
        // per spec, propagators from env must be deduplicated
        var uniquePropagatorNames = Array.from(new Set(getEnv().OTEL_PROPAGATORS));
        var propagators = uniquePropagatorNames.map(function (name) {
            var propagator = _this._getPropagator(name);
            if (!propagator) {
                diag.warn("Propagator \"" + name + "\" requested through environment variable is unavailable.");
            }
            return propagator;
        });
        var validPropagators = propagators.reduce(function (list, item) {
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
            return new CompositePropagator({
                propagators: validPropagators,
            });
        }
    };
    BasicTracerProvider.prototype._buildExporterFromEnv = function () {
        var exporterName = getEnv().OTEL_TRACES_EXPORTER;
        if (exporterName === 'none' || exporterName === '')
            return;
        var exporter = this._getSpanExporter(exporterName);
        if (!exporter) {
            diag.error("Exporter \"" + exporterName + "\" requested through environment variable is unavailable.");
        }
        return exporter;
    };
    BasicTracerProvider._registeredPropagators = new Map([
        ['tracecontext', function () { return new W3CTraceContextPropagator(); }],
        ['baggage', function () { return new W3CBaggagePropagator(); }],
    ]);
    BasicTracerProvider._registeredExporters = new Map();
    return BasicTracerProvider;
}());
export { BasicTracerProvider };
//# sourceMappingURL=BasicTracerProvider.js.map