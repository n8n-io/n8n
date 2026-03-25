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
exports.SimpleLogRecordProcessor = void 0;
const core_1 = require("@opentelemetry/core");
class SimpleLogRecordProcessor {
    _exporter;
    _shutdownOnce;
    _unresolvedExports;
    constructor(_exporter) {
        this._exporter = _exporter;
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
        this._unresolvedExports = new Set();
    }
    onEmit(logRecord) {
        if (this._shutdownOnce.isCalled) {
            return;
        }
        const doExport = () => core_1.internal
            ._export(this._exporter, [logRecord])
            .then((result) => {
            if (result.code !== core_1.ExportResultCode.SUCCESS) {
                (0, core_1.globalErrorHandler)(result.error ??
                    new Error(`SimpleLogRecordProcessor: log record export failed (status ${result})`));
            }
        })
            .catch(core_1.globalErrorHandler);
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
            }, core_1.globalErrorHandler);
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
exports.SimpleLogRecordProcessor = SimpleLogRecordProcessor;
//# sourceMappingURL=SimpleLogRecordProcessor.js.map