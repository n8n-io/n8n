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
const api_1 = require("@opentelemetry/api");
/**
 * {@link MetricReader} which collects metrics based on a user-configurable time interval, and passes the metrics to
 * the configured {@link PushMetricExporter}
 */
class PeriodicExportingMetricReader extends MetricReader_1.MetricReader {
    constructor(options) {
        var _a, _b, _c, _d;
        super({
            aggregationSelector: (_a = options.exporter.selectAggregation) === null || _a === void 0 ? void 0 : _a.bind(options.exporter),
            aggregationTemporalitySelector: (_b = options.exporter.selectAggregationTemporality) === null || _b === void 0 ? void 0 : _b.bind(options.exporter),
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
        this._exportInterval = (_c = options.exportIntervalMillis) !== null && _c !== void 0 ? _c : 60000;
        this._exportTimeout = (_d = options.exportTimeoutMillis) !== null && _d !== void 0 ? _d : 30000;
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
        var _a, _b;
        const { resourceMetrics, errors } = await this.collect({
            timeoutMillis: this._exportTimeout,
        });
        if (errors.length > 0) {
            api.diag.error('PeriodicExportingMetricReader: metrics collection errors', ...errors);
        }
        const doExport = async () => {
            const result = await core_1.internal._export(this._exporter, resourceMetrics);
            if (result.code !== core_1.ExportResultCode.SUCCESS) {
                throw new Error(`PeriodicExportingMetricReader: metrics export failed (error ${result.error})`);
            }
        };
        // Avoid scheduling a promise to make the behavior more predictable and easier to test
        if (resourceMetrics.resource.asyncAttributesPending) {
            (_b = (_a = resourceMetrics.resource).waitForAsyncAttributes) === null || _b === void 0 ? void 0 : _b.call(_a).then(doExport, err => api_1.diag.debug('Error while resolving async portion of resource: ', err));
        }
        else {
            await doExport();
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
        await this._exporter.shutdown();
    }
}
exports.PeriodicExportingMetricReader = PeriodicExportingMetricReader;
//# sourceMappingURL=PeriodicExportingMetricReader.js.map