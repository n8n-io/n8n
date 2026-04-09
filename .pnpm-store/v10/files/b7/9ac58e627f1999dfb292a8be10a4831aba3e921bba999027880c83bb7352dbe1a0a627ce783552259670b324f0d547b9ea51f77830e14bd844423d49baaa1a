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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { BatchLogRecordProcessorBase } from '../../../export/BatchLogRecordProcessorBase';
var BatchLogRecordProcessor = /** @class */ (function (_super) {
    __extends(BatchLogRecordProcessor, _super);
    function BatchLogRecordProcessor(exporter, config) {
        var _this = _super.call(this, exporter, config) || this;
        _this._onInit(config);
        return _this;
    }
    BatchLogRecordProcessor.prototype.onShutdown = function () {
        if (typeof document === 'undefined') {
            return;
        }
        if (this._visibilityChangeListener) {
            document.removeEventListener('visibilitychange', this._visibilityChangeListener);
        }
        if (this._pageHideListener) {
            document.removeEventListener('pagehide', this._pageHideListener);
        }
    };
    BatchLogRecordProcessor.prototype._onInit = function (config) {
        var _this = this;
        if ((config === null || config === void 0 ? void 0 : config.disableAutoFlushOnDocumentHide) === true ||
            typeof document === 'undefined') {
            return;
        }
        this._visibilityChangeListener = function () {
            if (document.visibilityState === 'hidden') {
                void _this.forceFlush();
            }
        };
        this._pageHideListener = function () {
            void _this.forceFlush();
        };
        document.addEventListener('visibilitychange', this._visibilityChangeListener);
        // use 'pagehide' event as a fallback for Safari; see https://bugs.webkit.org/show_bug.cgi?id=116769
        document.addEventListener('pagehide', this._pageHideListener);
    };
    return BatchLogRecordProcessor;
}(BatchLogRecordProcessorBase));
export { BatchLogRecordProcessor };
//# sourceMappingURL=BatchLogRecordProcessor.js.map