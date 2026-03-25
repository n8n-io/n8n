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
exports.MetricCollector = void 0;
const core_1 = require("@opentelemetry/core");
/**
 * An internal opaque interface that the MetricReader receives as
 * MetricProducer. It acts as the storage key to the internal metric stream
 * state for each MetricReader.
 */
class MetricCollector {
    _sharedState;
    _metricReader;
    constructor(_sharedState, _metricReader) {
        this._sharedState = _sharedState;
        this._metricReader = _metricReader;
    }
    async collect(options) {
        const collectionTime = (0, core_1.millisToHrTime)(Date.now());
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
exports.MetricCollector = MetricCollector;
//# sourceMappingURL=MetricCollector.js.map