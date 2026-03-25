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
exports.PeriodicExportingMetricReader = void 0;
const api = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const MetricReader_1 = require("./MetricReader");
const utils_1 = require("../utils");
/**
 * {@link MetricReader} which collects metrics based on a user-configurable time interval, and passes the metrics to
 * the configured {@link PushMetricExporter}
 */
class PeriodicExportingMetricReader extends MetricReader_1.MetricReader {
    _interval;
    _exporter;
    _exportInterval;
    _exportTimeout;
    constructor(options) {
        super({
            aggregationSelector: options.exporter.selectAggregation?.bind(options.exporter),
            aggregationTemporalitySelector: options.exporter.selectAggregationTemporality?.bind(options.exporter),
            metricProducers: options.metricProducers,
        });
        if (options.exportIntervalMillis !== undefined &&
            options.exportIntervalMillis <= 0) {
            throw Error('exportIntervalMillis must be greater than 0');
        }
        if (options.exportTimeoutMillis !== undefined &&
            options.exportTimeoutMillis <= 0) {
            throw Error('exportTimeoutMillis must be greater than 0');
        }
        if (options.exportTimeoutMillis !== undefined &&
            options.exportIntervalMillis !== undefined &&
            options.exportIntervalMillis < options.exportTimeoutMillis) {
            throw Error('exportIntervalMillis must be greater than or equal to exportTimeoutMillis');
        }
        this._exportInterval = options.exportIntervalMillis ?? 60000;
        this._exportTimeout = options.exportTimeoutMillis ?? 30000;
        this._exporter = options.exporter;
    }
    async _runOnce() {
        try {
            await (0, utils_1.callWithTimeout)(this._doRun(), this._exportTimeout);
        }
        catch (err) {
            if (err instanceof utils_1.TimeoutError) {
                api.diag.error('Export took longer than %s milliseconds and timed out.', this._exportTimeout);
                return;
            }
            (0, core_1.globalErrorHandler)(err);
        }
    }
    async _doRun() {
        const { resourceMetrics, errors } = await this.collect({
            timeoutMillis: this._exportTimeout,
        });
        if (errors.length > 0) {
            api.diag.error('PeriodicExportingMetricReader: metrics collection errors', ...errors);
        }
        if (resourceMetrics.resource.asyncAttributesPending) {
            try {
                await resourceMetrics.resource.waitForAsyncAttributes?.();
            }
            catch (e) {
                api.diag.debug('Error while resolving async portion of resource: ', e);
                (0, core_1.globalErrorHandler)(e);
            }
        }
        if (resourceMetrics.scopeMetrics.length === 0) {
            return;
        }
        const result = await core_1.internal._export(this._exporter, resourceMetrics);
        if (result.code !== core_1.ExportResultCode.SUCCESS) {
            throw new Error(`PeriodicExportingMetricReader: metrics export failed (error ${result.error})`);
        }
    }
    onInitialized() {
        // start running the interval as soon as this reader is initialized and keep handle for shutdown.
        this._interval = setInterval(() => {
            // this._runOnce never rejects. Using void operator to suppress @typescript-eslint/no-floating-promises.
            void this._runOnce();
        }, this._exportInterval);
        (0, core_1.unrefTimer)(this._interval);
    }
    async onForceFlush() {
        await this._runOnce();
        await this._exporter.forceFlush();
    }
    async onShutdown() {
        if (this._interval) {
            clearInterval(this._interval);
        }
        await this.onForceFlush();
        await this._exporter.shutdown();
    }
}
exports.PeriodicExportingMetricReader = PeriodicExportingMetricReader;
//# sourceMappingURL=PeriodicExportingMetricReader.js.map