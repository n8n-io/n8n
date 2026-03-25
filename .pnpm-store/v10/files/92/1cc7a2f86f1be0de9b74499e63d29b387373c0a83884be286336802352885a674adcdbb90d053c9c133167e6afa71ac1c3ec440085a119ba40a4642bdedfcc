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
import * as api from '@opentelemetry/api';
import { callWithTimeout, FlatMap } from '../utils';
import { DEFAULT_AGGREGATION_SELECTOR, DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR, } from './AggregationSelector';
/**
 * A registered reader of metrics that, when linked to a {@link MetricProducer}, offers global
 * control over metrics.
 */
export class MetricReader {
    // Tracks the shutdown state.
    // TODO: use BindOncePromise here once a new version of @opentelemetry/core is available.
    _shutdown = false;
    // Additional MetricProducers which will be combined with the SDK's output
    _metricProducers;
    // MetricProducer used by this instance which produces metrics from the SDK
    _sdkMetricProducer;
    _aggregationTemporalitySelector;
    _aggregationSelector;
    _cardinalitySelector;
    constructor(options) {
        this._aggregationSelector =
            options?.aggregationSelector ?? DEFAULT_AGGREGATION_SELECTOR;
        this._aggregationTemporalitySelector =
            options?.aggregationTemporalitySelector ??
                DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
        this._metricProducers = options?.metricProducers ?? [];
        this._cardinalitySelector = options?.cardinalitySelector;
    }
    setMetricProducer(metricProducer) {
        if (this._sdkMetricProducer) {
            throw new Error('MetricReader can not be bound to a MeterProvider again.');
        }
        this._sdkMetricProducer = metricProducer;
        this.onInitialized();
    }
    selectAggregation(instrumentType) {
        return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
        return this._aggregationTemporalitySelector(instrumentType);
    }
    selectCardinalityLimit(instrumentType) {
        return this._cardinalitySelector
            ? this._cardinalitySelector(instrumentType)
            : 2000; // default value if no selector is provided
    }
    /**
     * Handle once the SDK has initialized this {@link MetricReader}
     * Overriding this method is optional.
     */
    onInitialized() {
        // Default implementation is empty.
    }
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
                timeoutMillis: options?.timeoutMillis,
            }),
            ...this._metricProducers.map(producer => producer.collect({
                timeoutMillis: options?.timeoutMillis,
            })),
        ]);
        // Merge the results, keeping the SDK's Resource
        const errors = sdkCollectionResults.errors.concat(FlatMap(additionalCollectionResults, result => result.errors));
        const resource = sdkCollectionResults.resourceMetrics.resource;
        const scopeMetrics = sdkCollectionResults.resourceMetrics.scopeMetrics.concat(FlatMap(additionalCollectionResults, result => result.resourceMetrics.scopeMetrics));
        return {
            resourceMetrics: {
                resource,
                scopeMetrics,
            },
            errors,
        };
    }
    async shutdown(options) {
        // Do not call shutdown again if it has already been called.
        if (this._shutdown) {
            api.diag.error('Cannot call shutdown twice.');
            return;
        }
        // No timeout if timeoutMillis is undefined or null.
        if (options?.timeoutMillis == null) {
            await this.onShutdown();
        }
        else {
            await callWithTimeout(this.onShutdown(), options.timeoutMillis);
        }
        this._shutdown = true;
    }
    async forceFlush(options) {
        if (this._shutdown) {
            api.diag.warn('Cannot forceFlush on already shutdown MetricReader.');
            return;
        }
        // No timeout if timeoutMillis is undefined or null.
        if (options?.timeoutMillis == null) {
            await this.onForceFlush();
            return;
        }
        await callWithTimeout(this.onForceFlush(), options.timeoutMillis);
    }
}
//# sourceMappingURL=MetricReader.js.map