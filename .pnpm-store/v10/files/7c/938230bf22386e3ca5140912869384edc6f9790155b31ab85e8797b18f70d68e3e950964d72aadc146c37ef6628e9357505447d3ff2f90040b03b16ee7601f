"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPExporterBase = void 0;
class OTLPExporterBase {
    _delegate;
    constructor(delegate) {
        this._delegate = delegate;
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