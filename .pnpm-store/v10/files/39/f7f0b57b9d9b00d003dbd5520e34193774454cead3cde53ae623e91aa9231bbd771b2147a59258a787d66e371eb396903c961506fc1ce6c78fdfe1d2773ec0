/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag } from '@opentelemetry/api';
import { ExportResultCode, globalErrorHandler, BindOnceFuture, internal, callWithTimeout, } from '@opentelemetry/core';
export class BatchLogRecordProcessorBase {
    _maxExportBatchSize;
    _maxQueueSize;
    _scheduledDelayMillis;
    _exportTimeoutMillis;
    _exporter;
    _isExporting = false;
    _finishedLogRecords = [];
    _timer;
    _shutdownOnce;
    constructor(exporter, config) {
        this._exporter = exporter;
        this._maxExportBatchSize = config?.maxExportBatchSize ?? 512;
        this._maxQueueSize = config?.maxQueueSize ?? 2048;
        this._scheduledDelayMillis = config?.scheduledDelayMillis ?? 5000;
        this._exportTimeoutMillis = config?.exportTimeoutMillis ?? 30000;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        if (this._maxExportBatchSize > this._maxQueueSize) {
            diag.warn('BatchLogRecordProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize');
            this._maxExportBatchSize = this._maxQueueSize;
        }
    }
    onEmit(logRecord) {
        if (this._shutdownOnce.isCalled) {
            return;
        }
        this._addToBuffer(logRecord);
    }
    forceFlush() {
        if (this._shutdownOnce.isCalled) {
            return this._shutdownOnce.promise;
        }
        return this._flushAll();
    }
    shutdown() {
        return this._shutdownOnce.call();
    }
    async _shutdown() {
        this.onShutdown();
        await this._flushAll();
        await this._exporter.shutdown();
    }
    /** Add a LogRecord in the buffer. */
    _addToBuffer(logRecord) {
        if (this._finishedLogRecords.length >= this._maxQueueSize) {
            return;
        }
        this._finishedLogRecords.push(logRecord);
        this._maybeStartTimer();
    }
    /**
     * Send all LogRecords to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    _flushAll() {
        return new Promise((resolve, reject) => {
            const promises = [];
            const batchCount = Math.ceil(this._finishedLogRecords.length / this._maxExportBatchSize);
            for (let i = 0; i < batchCount; i++) {
                promises.push(this._flushOneBatch());
            }
            Promise.all(promises)
                .then(() => {
                resolve();
            })
                .catch(reject);
        });
    }
    _flushOneBatch() {
        this._clearTimer();
        if (this._finishedLogRecords.length === 0) {
            return Promise.resolve();
        }
        return callWithTimeout(this._export(this._finishedLogRecords.splice(0, this._maxExportBatchSize)), this._exportTimeoutMillis);
    }
    _maybeStartTimer() {
        if (this._isExporting)
            return;
        const flush = () => {
            this._isExporting = true;
            this._flushOneBatch()
                .then(() => {
                this._isExporting = false;
                if (this._finishedLogRecords.length > 0) {
                    this._clearTimer();
                    this._maybeStartTimer();
                }
            })
                .catch(e => {
                this._isExporting = false;
                globalErrorHandler(e);
            });
        };
        // we only wait if the queue doesn't have enough elements yet
        if (this._finishedLogRecords.length >= this._maxExportBatchSize) {
            return flush();
        }
        if (this._timer !== undefined)
            return;
        this._timer = setTimeout(() => flush(), this._scheduledDelayMillis);
        // depending on runtime, this may be a 'number' or NodeJS.Timeout
        if (typeof this._timer !== 'number') {
            this._timer.unref();
        }
    }
    _clearTimer() {
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    }
    _export(logRecords) {
        const doExport = () => internal
            ._export(this._exporter, logRecords)
            .then((result) => {
            if (result.code !== ExportResultCode.SUCCESS) {
                globalErrorHandler(result.error ??
                    new Error(`BatchLogRecordProcessor: log record export failed (status ${result})`));
            }
        })
            .catch(globalErrorHandler);
        const pendingResources = [];
        for (let i = 0; i < logRecords.length; i++) {
            const resource = logRecords[i].resource;
            if (resource.asyncAttributesPending &&
                typeof resource.waitForAsyncAttributes === 'function') {
                pendingResources.push(resource.waitForAsyncAttributes());
            }
        }
        // Avoid scheduling a promise to make the behavior more predictable and easier to test
        if (pendingResources.length === 0) {
            return doExport();
        }
        else {
            return Promise.all(pendingResources).then(doExport, globalErrorHandler);
        }
    }
}
//# sourceMappingURL=BatchLogRecordProcessorBase.js.map