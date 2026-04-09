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
import { context, diag, TraceFlags } from '@opentelemetry/api';
import { BindOnceFuture, ExportResultCode, getEnv, globalErrorHandler, suppressTracing, unrefTimer, } from '@opentelemetry/core';
/**
 * Implementation of the {@link SpanProcessor} that batches spans exported by
 * the SDK then pushes them to the exporter pipeline.
 */
var BatchSpanProcessorBase = /** @class */ (function () {
    function BatchSpanProcessorBase(_exporter, config) {
        this._exporter = _exporter;
        this._isExporting = false;
        this._finishedSpans = [];
        this._droppedSpansCount = 0;
        var env = getEnv();
        this._maxExportBatchSize =
            typeof (config === null || config === void 0 ? void 0 : config.maxExportBatchSize) === 'number'
                ? config.maxExportBatchSize
                : env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE;
        this._maxQueueSize =
            typeof (config === null || config === void 0 ? void 0 : config.maxQueueSize) === 'number'
                ? config.maxQueueSize
                : env.OTEL_BSP_MAX_QUEUE_SIZE;
        this._scheduledDelayMillis =
            typeof (config === null || config === void 0 ? void 0 : config.scheduledDelayMillis) === 'number'
                ? config.scheduledDelayMillis
                : env.OTEL_BSP_SCHEDULE_DELAY;
        this._exportTimeoutMillis =
            typeof (config === null || config === void 0 ? void 0 : config.exportTimeoutMillis) === 'number'
                ? config.exportTimeoutMillis
                : env.OTEL_BSP_EXPORT_TIMEOUT;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        if (this._maxExportBatchSize > this._maxQueueSize) {
            diag.warn('BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize');
            this._maxExportBatchSize = this._maxQueueSize;
        }
    }
    BatchSpanProcessorBase.prototype.forceFlush = function () {
        if (this._shutdownOnce.isCalled) {
            return this._shutdownOnce.promise;
        }
        return this._flushAll();
    };
    // does nothing.
    BatchSpanProcessorBase.prototype.onStart = function (_span, _parentContext) { };
    BatchSpanProcessorBase.prototype.onEnd = function (span) {
        if (this._shutdownOnce.isCalled) {
            return;
        }
        if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
            return;
        }
        this._addToBuffer(span);
    };
    BatchSpanProcessorBase.prototype.shutdown = function () {
        return this._shutdownOnce.call();
    };
    BatchSpanProcessorBase.prototype._shutdown = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.onShutdown();
        })
            .then(function () {
            return _this._flushAll();
        })
            .then(function () {
            return _this._exporter.shutdown();
        });
    };
    /** Add a span in the buffer. */
    BatchSpanProcessorBase.prototype._addToBuffer = function (span) {
        if (this._finishedSpans.length >= this._maxQueueSize) {
            // limit reached, drop span
            if (this._droppedSpansCount === 0) {
                diag.debug('maxQueueSize reached, dropping spans');
            }
            this._droppedSpansCount++;
            return;
        }
        if (this._droppedSpansCount > 0) {
            // some spans were dropped, log once with count of spans dropped
            diag.warn("Dropped " + this._droppedSpansCount + " spans because maxQueueSize reached");
            this._droppedSpansCount = 0;
        }
        this._finishedSpans.push(span);
        this._maybeStartTimer();
    };
    /**
     * Send all spans to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    BatchSpanProcessorBase.prototype._flushAll = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var promises = [];
            // calculate number of batches
            var count = Math.ceil(_this._finishedSpans.length / _this._maxExportBatchSize);
            for (var i = 0, j = count; i < j; i++) {
                promises.push(_this._flushOneBatch());
            }
            Promise.all(promises)
                .then(function () {
                resolve();
            })
                .catch(reject);
        });
    };
    BatchSpanProcessorBase.prototype._flushOneBatch = function () {
        var _this = this;
        this._clearTimer();
        if (this._finishedSpans.length === 0) {
            return Promise.resolve();
        }
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
                // don't wait anymore for export, this way the next batch can start
                reject(new Error('Timeout'));
            }, _this._exportTimeoutMillis);
            // prevent downstream exporter calls from generating spans
            context.with(suppressTracing(context.active()), function () {
                // Reset the finished spans buffer here because the next invocations of the _flush method
                // could pass the same finished spans to the exporter if the buffer is cleared
                // outside the execution of this callback.
                var spans;
                if (_this._finishedSpans.length <= _this._maxExportBatchSize) {
                    spans = _this._finishedSpans;
                    _this._finishedSpans = [];
                }
                else {
                    spans = _this._finishedSpans.splice(0, _this._maxExportBatchSize);
                }
                var doExport = function () {
                    return _this._exporter.export(spans, function (result) {
                        var _a;
                        clearTimeout(timer);
                        if (result.code === ExportResultCode.SUCCESS) {
                            resolve();
                        }
                        else {
                            reject((_a = result.error) !== null && _a !== void 0 ? _a : new Error('BatchSpanProcessor: span export failed'));
                        }
                    });
                };
                var pendingResources = null;
                for (var i = 0, len = spans.length; i < len; i++) {
                    var span = spans[i];
                    if (span.resource.asyncAttributesPending &&
                        span.resource.waitForAsyncAttributes) {
                        pendingResources !== null && pendingResources !== void 0 ? pendingResources : (pendingResources = []);
                        pendingResources.push(span.resource.waitForAsyncAttributes());
                    }
                }
                // Avoid scheduling a promise to make the behavior more predictable and easier to test
                if (pendingResources === null) {
                    doExport();
                }
                else {
                    Promise.all(pendingResources).then(doExport, function (err) {
                        globalErrorHandler(err);
                        reject(err);
                    });
                }
            });
        });
    };
    BatchSpanProcessorBase.prototype._maybeStartTimer = function () {
        var _this = this;
        if (this._isExporting)
            return;
        var flush = function () {
            _this._isExporting = true;
            _this._flushOneBatch()
                .finally(function () {
                _this._isExporting = false;
                if (_this._finishedSpans.length > 0) {
                    _this._clearTimer();
                    _this._maybeStartTimer();
                }
            })
                .catch(function (e) {
                _this._isExporting = false;
                globalErrorHandler(e);
            });
        };
        // we only wait if the queue doesn't have enough elements yet
        if (this._finishedSpans.length >= this._maxExportBatchSize) {
            return flush();
        }
        if (this._timer !== undefined)
            return;
        this._timer = setTimeout(function () { return flush(); }, this._scheduledDelayMillis);
        unrefTimer(this._timer);
    };
    BatchSpanProcessorBase.prototype._clearTimer = function () {
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    };
    return BatchSpanProcessorBase;
}());
export { BatchSpanProcessorBase };
//# sourceMappingURL=BatchSpanProcessorBase.js.map