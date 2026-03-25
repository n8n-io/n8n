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
import { BindOnceFuture, ExportResultCode, globalErrorHandler, internal, } from '@opentelemetry/core';
export class SimpleLogRecordProcessor {
    _exporter;
    _shutdownOnce;
    _unresolvedExports;
    constructor(_exporter) {
        this._exporter = _exporter;
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