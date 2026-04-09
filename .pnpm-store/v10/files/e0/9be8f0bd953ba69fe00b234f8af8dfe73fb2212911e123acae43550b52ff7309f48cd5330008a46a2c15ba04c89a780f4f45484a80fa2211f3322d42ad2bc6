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
exports.MetricReader = void 0;
const api = require("@opentelemetry/api");
const utils_1 = require("../utils");
const AggregationSelector_1 = require("./AggregationSelector");
/**
 * A registered reader of metrics that, when linked to a {@link MetricProducer}, offers global
 * control over metrics.
 */
class MetricReader {
    constructor(options) {
        var _a, _b, _c;
        // Tracks the shutdown state.
        // TODO: use BindOncePromise here once a new version of @opentelemetry/core is available.
        this._shutdown = false;
        this._aggregationSelector =
            (_a = options === null || options === void 0 ? void 0 : options.aggregationSelector) !== null && _a !== void 0 ? _a : AggregationSelector_1.DEFAULT_AGGREGATION_SELECTOR;
        this._aggregationTemporalitySelector =
            (_b = options === null || options === void 0 ? void 0 : options.aggregationTemporalitySelector) !== null && _b !== void 0 ? _b : AggregationSelector_1.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
        this._metricProducers = (_c = options === null || options === void 0 ? void 0 : options.metricProducers) !== null && _c !== void 0 ? _c : [];
    }
    /**
     * Set the {@link MetricProducer} used by this instance. **This should only be called by the
     * SDK and should be considered internal.**
     *
     * To add additional {@link MetricProducer}s to a {@link MetricReader}, pass them to the
     * constructor as {@link MetricReaderOptions.metricProducers}.
     *
     * @internal
     * @param metricProducer
     */
    setMetricProducer(metricProducer) {
        if (this._sdkMetricProducer) {
            throw new Error('MetricReader can not be bound to a MeterProvider again.');
        }
        this._sdkMetricProducer = metricProducer;
        this.onInitialized();
    }
    /**
     * Select the {@link Aggregation} for the given {@link InstrumentType} for this
     * reader.
     */
    selectAggregation(instrumentType) {
        return this._aggregationSelector(instrumentType);
    }
    /**
     * Select the {@link AggregationTemporality} for the given
     * {@link InstrumentType} for this reader.
     */
    selectAggregationTemporality(instrumentType) {
        return this._aggregationTemporalitySelector(instrumentType);
    }
    /**
     * Handle once the SDK has initialized this {@link MetricReader}
     * Overriding this method is optional.
     */
    onInitialized() {
        // Default implementation is empty.
    }
    /**
     * Collect all metrics from the associated {@link MetricProducer}
     */
    async collect(options) {
        if (this._sdkMetricProducer === undefined) {
            throw new Error('MetricReader is not bound to a MetricProducer');
        }
        // Subsequent invocations to collect are not allowed. SDKs SHOULD return some failure for these calls.
        if (this._shutdown) {
            throw new Error('MetricReader is shutdown');
        }
        const [sdkCollectionResults, ...additionalCollectionResults] = await Promise.all([
            this._sdkMetricProducer.collect({
                timeoutMillis: options === null || options === void 0 ? void 0 : options.timeoutMillis,
            }),
            ...this._metricProducers.map(producer => producer.collect({
                timeoutMillis: options === null || options === void 0 ? void 0 : options.timeoutMillis,
            })),
        ]);
        // Merge the results, keeping the SDK's Resource
        const errors = sdkCollectionResults.errors.concat((0, utils_1.FlatMap)(additionalCollectionResults, result => result.errors));
        const resource = sdkCollectionResults.resourceMetrics.resource;
        const scopeMetrics = sdkCollectionResults.resourceMetrics.scopeMetrics.concat((0, utils_1.FlatMap)(additionalCollectionResults, result => result.resourceMetrics.scopeMetrics));
        return {
            resourceMetrics: {
                resource,
                scopeMetrics,
            },
            errors,
        };
    }
    /**
     * Shuts down the metric reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation will continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    async shutdown(options) {
        // Do not call shutdown again if it has already been called.
        if (this._shutdown) {
            api.diag.error('Cannot call shutdown twice.');
            return;
        }
        // No timeout if timeoutMillis is undefined or null.
        if ((options === null || options === void 0 ? void 0 : options.timeoutMillis) == null) {
            await this.onShutdown();
        }
        else {
            await (0, utils_1.callWithTimeout)(this.onShutdown(), options.timeoutMillis);
        }
        this._shutdown = true;
    }
    /**
     * Flushes metrics read by this reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation will continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    async forceFlush(options) {
        if (this._shutdown) {
            api.diag.warn('Cannot forceFlush on already shutdown MetricReader.');
            return;
        }
        // No timeout if timeoutMillis is undefined or null.
        if ((options === null || options === void 0 ? void 0 : options.timeoutMillis) == null) {
            await this.onForceFlush();
            return;
        }
        await (0, utils_1.callWithTimeout)(this.onForceFlush(), options.timeoutMillis);
    }
}
exports.MetricReader = MetricReader;
//# sourceMappingURL=MetricReader.js.map