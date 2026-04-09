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
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const util_1 = require("./util");
/**
 * Collector Exporter abstract base class
 */
class OTLPExporterBase {
    /**
     * @param config
     */
    constructor(config = {}) {
        this._sendingPromises = [];
        this.url = this.getDefaultUrl(config);
        if (typeof config.hostname === 'string') {
            this.hostname = config.hostname;
        }
        this.shutdown = this.shutdown.bind(this);
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
        this._concurrencyLimit =
            typeof config.concurrencyLimit === 'number'
                ? config.concurrencyLimit
                : 30;
        this.timeoutMillis = (0, util_1.configureExporterTimeout)(config.timeoutMillis);
        // platform dependent
        this.onInit(config);
    }
    /**
     * Export items.
     * @param items
     * @param resultCallback
     */
    export(items, resultCallback) {
        if (this._shutdownOnce.isCalled) {
            resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new Error('Exporter has been shutdown'),
            });
            return;
        }
        if (this._sendingPromises.length >= this._concurrencyLimit) {
            resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new Error('Concurrent export limit reached'),
            });
            return;
        }
        this._export(items)
            .then(() => {
            resultCallback({ code: core_1.ExportResultCode.SUCCESS });
        })
            .catch((error) => {
            resultCallback({ code: core_1.ExportResultCode.FAILED, error });
        });
    }
    _export(items) {
        return new Promise((resolve, reject) => {
            try {
                api_1.diag.debug('items to be sent', items);
                this.send(items, resolve, reject);
            }
            catch (e) {
                reject(e);
            }
        });
    }
    /**
     * Shutdown the exporter.
     */
    shutdown() {
        return this._shutdownOnce.call();
    }
    /**
     * Exports any pending spans in the exporter
     */
    forceFlush() {
        return Promise.all(this._sendingPromises).then(() => {
            /** ignore resolved values */
        });
    }
    /**
     * Called by _shutdownOnce with BindOnceFuture
     */
    _shutdown() {
        api_1.diag.debug('shutdown started');
        this.onShutdown();
        return this.forceFlush();
    }
}
exports.OTLPExporterBase = OTLPExporterBase;
//# sourceMappingURL=OTLPExporterBase.js.map