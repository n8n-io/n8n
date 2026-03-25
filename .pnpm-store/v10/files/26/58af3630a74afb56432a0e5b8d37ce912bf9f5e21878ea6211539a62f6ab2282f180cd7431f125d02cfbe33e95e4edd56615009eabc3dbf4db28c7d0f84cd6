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
exports.BatchSpanProcessor = void 0;
const BatchSpanProcessorBase_1 = require("../../../export/BatchSpanProcessorBase");
const core_1 = require("@opentelemetry/core");
class BatchSpanProcessor extends BatchSpanProcessorBase_1.BatchSpanProcessorBase {
    _visibilityChangeListener;
    _pageHideListener;
    constructor(_exporter, config) {
        super(_exporter, config);
        this.onInit(config);
    }
    onInit(config) {
        if (config?.disableAutoFlushOnDocumentHide !== true &&
            typeof document !== 'undefined') {
            this._visibilityChangeListener = () => {
                if (document.visibilityState === 'hidden') {
                    this.forceFlush().catch(error => {
                        (0, core_1.globalErrorHandler)(error);
                    });
                }
            };
            this._pageHideListener = () => {
                this.forceFlush().catch(error => {
                    (0, core_1.globalErrorHandler)(error);
                });
            };
            document.addEventListener('visibilitychange', this._visibilityChangeListener);
            // use 'pagehide' event as a fallback for Safari; see https://bugs.webkit.org/show_bug.cgi?id=116769
            document.addEventListener('pagehide', this._pageHideListener);
        }
    }
    onShutdown() {
        if (typeof document !== 'undefined') {
            if (this._visibilityChangeListener) {
                document.removeEventListener('visibilitychange', this._visibilityChangeListener);
            }
            if (this._pageHideListener) {
                document.removeEventListener('pagehide', this._pageHideListener);
            }
        }
    }
}
exports.BatchSpanProcessor = BatchSpanProcessor;
//# sourceMappingURL=BatchSpanProcessor.js.map