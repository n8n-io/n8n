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
exports.SimpleSpanProcessor = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
/**
 * An implementation of the {@link SpanProcessor} that converts the {@link Span}
 * to {@link ReadableSpan} and passes it to the configured exporter.
 *
 * Only spans that are sampled are converted.
 *
 * NOTE: This {@link SpanProcessor} exports every ended span individually instead of batching spans together, which causes significant performance overhead with most exporters. For production use, please consider using the {@link BatchSpanProcessor} instead.
 */
class SimpleSpanProcessor {
    constructor(_exporter) {
        this._exporter = _exporter;
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
        this._unresolvedExports = new Set();
    }
    async forceFlush() {
        // await unresolved resources before resolving
        await Promise.all(Array.from(this._unresolvedExports));
        if (this._exporter.forceFlush) {
            await this._exporter.forceFlush();
        }
    }
    onStart(_span, _parentContext) { }
    onEnd(span) {
        var _a, _b;
        if (this._shutdownOnce.isCalled) {
            return;
        }
        if ((span.spanContext().traceFlags & api_1.TraceFlags.SAMPLED) === 0) {
            return;
        }
        const doExport = () => core_1.internal
            ._export(this._exporter, [span])
            .then((result) => {
            var _a;
            if (result.code !== core_1.ExportResultCode.SUCCESS) {
                (0, core_1.globalErrorHandler)((_a = result.error) !== null && _a !== void 0 ? _a : new Error(`SimpleSpanProcessor: span export failed (status ${result})`));
            }
        })
            .catch(error => {
            (0, core_1.globalErrorHandler)(error);
        });
        // Avoid scheduling a promise to make the behavior more predictable and easier to test
        if (span.resource.asyncAttributesPending) {
            const exportPromise = (_b = (_a = span.resource).waitForAsyncAttributes) === null || _b === void 0 ? void 0 : _b.call(_a).then(() => {
                if (exportPromise != null) {
                    this._unresolvedExports.delete(exportPromise);
                }
                return doExport();
            }, err => (0, core_1.globalErrorHandler)(err));
            // store the unresolved exports
            if (exportPromise != null) {
                this._unresolvedExports.add(exportPromise);
            }
        }
        else {
            void doExport();
        }
    }
    shutdown() {
        return this._shutdownOnce.call();
    }
    _shutdown() {
        return this._exporter.shutdown();
    }
}
exports.SimpleSpanProcessor = SimpleSpanProcessor;
//# sourceMappingURL=SimpleSpanProcessor.js.map