/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { BindOnceFuture, ExportResultCode, globalErrorHandler, internal, } from '@opentelemetry/core';
/**
 * An implementation of the {@link LogRecordProcessor} interface that exports
 * each {@link LogRecord} as it is emitted.
 *
 * NOTE: This {@link LogRecordProcessor} exports every {@link LogRecord}
 * individually instead of batching them together, which can cause significant
 * performance overhead with most exporters. For production use, please consider
 * using the {@link BatchLogRecordProcessor} instead.
 */
export class SimpleLogRecordProcessor {
    _exporter;
    _shutdownOnce;
    _unresolvedExports;
    constructor(exporter) {
        this._exporter = exporter;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        this._unresolvedExports = new Set();
    }
    onEmit(logRecord) {
        if (this._shutdownOnce.isCalled) {
            return;
        }
        const doExport = () => internal
            ._export(this._exporter, [logRecord])
            .then((result) => {
            if (result.code !== ExportResultCode.SUCCESS) {
                globalErrorHandler(result.error ??
                    new Error(`SimpleLogRecordProcessor: log record export failed (status ${result})`));
            }
        })
            .catch(globalErrorHandler);
        // Avoid scheduling a promise to make the behavior more predictable and easier to test
        if (logRecord.resource.asyncAttributesPending) {
            const exportPromise = logRecord.resource
                .waitForAsyncAttributes?.()
                .then(() => {
                // Using TS Non-null assertion operator because exportPromise could not be null in here
                // if waitForAsyncAttributes is not present this code will never be reached
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this._unresolvedExports.delete(exportPromise);
                return doExport();
            }, globalErrorHandler);
            // store the unresolved exports
            if (exportPromise != null) {
                this._unresolvedExports.add(exportPromise);
            }
        }
        else {
            void doExport();
        }
    }
    async forceFlush() {
        // await unresolved resources before resolving
        await Promise.all(Array.from(this._unresolvedExports));
    }
    shutdown() {
        return this._shutdownOnce.call();
    }
    _shutdown() {
        return this._exporter.shutdown();
    }
}
//# sourceMappingURL=SimpleLogRecordProcessor.js.map