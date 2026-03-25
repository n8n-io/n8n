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
import { ExportResultCode } from '@opentelemetry/core';
import { DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR, } from './AggregationSelector';
/**
 * This is an implementation of {@link PushMetricExporter} that prints metrics to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link PushMetricExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
/* eslint-disable no-console */
export class ConsoleMetricExporter {
    _shutdown = false;
    _temporalitySelector;
    constructor(options) {
        this._temporalitySelector =
            options?.temporalitySelector ?? DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
    }
    export(metrics, resultCallback) {
        if (this._shutdown) {
            // If the exporter is shutting down, by spec, we need to return FAILED as export result
            setImmediate(resultCallback, { code: ExportResultCode.FAILED });
            return;
        }
        return ConsoleMetricExporter._sendMetrics(metrics, resultCallback);
    }
    forceFlush() {
        return Promise.resolve();
    }
    selectAggregationTemporality(_instrumentType) {
        return this._temporalitySelector(_instrumentType);
    }
    shutdown() {
        this._shutdown = true;
        return Promise.resolve();
    }
    static _sendMetrics(metrics, done) {
        for (const scopeMetrics of metrics.scopeMetrics) {
            for (const metric of scopeMetrics.metrics) {
                console.dir({
                    descriptor: metric.descriptor,
                    dataPointType: metric.dataPointType,
                    dataPoints: metric.dataPoints,
                }, { depth: null });
            }
        }
        done({ code: ExportResultCode.SUCCESS });
    }
}
//# sourceMappingURL=ConsoleMetricExporter.js.map