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
exports.OTLPExporterBase = void 0;
class OTLPExporterBase {
    _delegate;
    constructor(_delegate) {
        this._delegate = _delegate;
    }
    /**
     * Export items.
     * @param items
     * @param resultCallback
     */
    export(items, resultCallback) {
        this._delegate.export(items, resultCallback);
    }
    forceFlush() {
        return this._delegate.forceFlush();
    }
    shutdown() {
        return this._delegate.shutdown();
    }
}
exports.OTLPExporterBase = OTLPExporterBase;
//# sourceMappingURL=OTLPExporterBase.js.map