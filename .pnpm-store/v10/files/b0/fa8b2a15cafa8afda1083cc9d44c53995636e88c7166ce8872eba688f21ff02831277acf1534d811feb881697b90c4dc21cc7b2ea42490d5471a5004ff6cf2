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
import { internal, ExportResultCode, globalErrorHandler, } from '@opentelemetry/core';
import { MetricReader } from './MetricReader';
import { callWithTimeout, TimeoutError } from '../utils';
/**
 * {@link MetricReader} which collects metrics based on a user-configurable time interval, and passes the metrics to
 * the configured {@link PushMetricExporter}
 */
export class PeriodicExportingMetricReader extends MetricReader {
    _interval;
    _exporter;
    _exportInterval;
    _exportTimeout;
    constructor(options) {
        const { exporter, exportIntervalMillis = 60000, metricProducers } = options;
        let { exportTimeoutMillis = 30000 } = options;
        super({
            aggregationSelector: exporter.selectAggregation?.bind(exporter),
            aggregationTemporalitySelector: exporter.selectAggregationTemporality?.bind(exporter),
            metricProducers,
        });
        if (exportIntervalMillis <= 0) {
            throw Error('exportIntervalMillis must be greater than 0');
        }
        if (exportTimeoutMillis <= 0) {
            throw Error('exportTimeoutMillis must be greater than 0');
        }
        if (exportIntervalMillis < exportTimeoutMillis) {
            if ('exportIntervalMillis' in options &&
                'exportTimeoutMillis' in options) {
                // An invalid combination of values was explicitly provided.
                throw Error('exportIntervalMillis must be greater than or equal to exportTimeoutMillis');
            }
            else {
                // An invalid combination of value was implicitly provided.
                api.diag.info(`Timeout of ${exportTimeoutMillis} exceeds the interval of ${exportIntervalMillis}. Clamping timeout to interval duration.`);
                exportTimeoutMillis = exportIntervalMillis;
            }
        }
        this._exportInterval = exportIntervalMillis;
        this._exportTimeout = exportTimeoutMillis;
        this._exporter = exporter;
    }
    async _runOnce() {
        try {
            await callWithTimeout(this._doRun(), this._exportTimeout);
        }
        catch (err) {
            if (err instanceof TimeoutError) {
                api.diag.error('Export took longer than %s milliseconds and timed out.', this._exportTimeout);
                return;
            }
            globalErrorHandler(err);
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
                globalErrorHandler(e);
            }
        }
        if (resourceMetrics.scopeMetrics.length === 0) {
            return;
        }
        const result = await internal._export(this._exporter, resourceMetrics);
        if (result.code !== ExportResultCode.SUCCESS) {
            throw new Error(`PeriodicExportingMetricReader: metrics export failed (error ${result.error})`);
        }
    }
    onInitialized() {
        // start running the interval as soon as this reader is initialized and keep handle for shutdown.
        this._interval = setInterval(() => {
            // this._runOnce never rejects. Using void operator to suppress @typescript-eslint/no-floating-promises.
            void this._runOnce();
        }, this._exportInterval);
        // depending on runtime, this may be a 'number' or NodeJS.Timeout
        if (typeof this._interval !== 'number') {
            this._interval.unref();
        }
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
//# sourceMappingURL=PeriodicExportingMetricReader.js.map