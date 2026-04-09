/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { BatchLogRecordProcessorBase } from '../../../export/BatchLogRecordProcessorBase';
export class BatchLogRecordProcessor extends BatchLogRecordProcessorBase {
    _visibilityChangeListener;
    _pageHideListener;
    constructor(exporter, config) {
        super(exporter, config);
        this._onInit(config);
    }
    onShutdown() {
        if (typeof document === 'undefined') {
            return;
        }
        if (this._visibilityChangeListener) {
            document.removeEventListener('visibilitychange', this._visibilityChangeListener);
        }
        if (this._pageHideListener) {
            document.removeEventListener('pagehide', this._pageHideListener);
        }
    }
    _onInit(config) {
        if (config?.disableAutoFlushOnDocumentHide === true ||
            typeof document === 'undefined') {
            return;
        }
        this._visibilityChangeListener = () => {
            if (document.visibilityState === 'hidden') {
                void this.forceFlush();
            }
        };
        this._pageHideListener = () => {
            void this.forceFlush();
        };
        document.addEventListener('visibilitychange', this._visibilityChangeListener);
        // use 'pagehide' event as a fallback for Safari; see https://bugs.webkit.org/show_bug.cgi?id=116769
        document.addEventListener('pagehide', this._pageHideListener);
    }
}
//# sourceMappingURL=BatchLogRecordProcessor.js.map