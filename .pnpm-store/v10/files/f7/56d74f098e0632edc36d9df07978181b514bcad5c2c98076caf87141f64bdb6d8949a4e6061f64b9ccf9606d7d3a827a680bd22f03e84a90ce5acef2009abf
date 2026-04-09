/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { millisToHrTime } from '@opentelemetry/core';
/**
 * An internal opaque interface that the MetricReader receives as
 * MetricProducer. It acts as the storage key to the internal metric stream
 * state for each MetricReader.
 */
export class MetricCollector {
    _sharedState;
    _metricReader;
    constructor(sharedState, metricReader) {
        this._sharedState = sharedState;
        this._metricReader = metricReader;
    }
    async collect(options) {
        const collectionTime = millisToHrTime(Date.now());
        const scopeMetrics = [];
        const errors = [];
        const meterCollectionPromises = Array.from(this._sharedState.meterSharedStates.values()).map(async (meterSharedState) => {
            const current = await meterSharedState.collect(this, collectionTime, options);
            // only add scope metrics if available
            if (current?.scopeMetrics != null) {
                scopeMetrics.push(current.scopeMetrics);
            }
            // only add errors if available
            if (current?.errors != null) {
                errors.push(...current.errors);
            }
        });
        await Promise.all(meterCollectionPromises);
        return {
            resourceMetrics: {
                resource: this._sharedState.resource,
                scopeMetrics: scopeMetrics,
            },
            errors: errors,
        };
    }
    /**
     * Delegates for MetricReader.forceFlush.
     */
    async forceFlush(options) {
        await this._metricReader.forceFlush(options);
    }
    /**
     * Delegates for MetricReader.shutdown.
     */
    async shutdown(options) {
        await this._metricReader.shutdown(options);
    }
    selectAggregationTemporality(instrumentType) {
        return this._metricReader.selectAggregationTemporality(instrumentType);
    }
    selectAggregation(instrumentType) {
        return this._metricReader.selectAggregation(instrumentType);
    }
    /**
     * Select the cardinality limit for the given {@link InstrumentType} for this
     * collector.
     */
    selectCardinalityLimit(instrumentType) {
        return this._metricReader.selectCardinalityLimit?.(instrumentType) ?? 2000;
    }
}
//# sourceMappingURL=MetricCollector.js.map