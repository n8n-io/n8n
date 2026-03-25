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
exports.ZipkinExporter = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const index_1 = require("./platform/index");
const transform_1 = require("./transform");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const utils_1 = require("./utils");
/**
 * Zipkin Exporter
 */
class ZipkinExporter {
    DEFAULT_SERVICE_NAME = 'OpenTelemetry Service';
    _statusCodeTagName;
    _statusDescriptionTagName;
    _urlStr;
    _send;
    _getHeaders;
    _serviceName;
    _isShutdown;
    _sendingPromises = [];
    constructor(config = {}) {
        this._urlStr =
            config.url ||
                ((0, core_1.getStringFromEnv)('OTEL_EXPORTER_ZIPKIN_ENDPOINT') ??
                    'http://localhost:9411/api/v2/spans');
        this._send = (0, index_1.prepareSend)(this._urlStr, config.headers);
        this._serviceName = config.serviceName;
        this._statusCodeTagName =
            config.statusCodeTagName || transform_1.defaultStatusCodeTagName;
        this._statusDescriptionTagName =
            config.statusDescriptionTagName || transform_1.defaultStatusErrorTagName;
        this._isShutdown = false;
        if (typeof config.getExportRequestHeaders === 'function') {
            this._getHeaders = (0, utils_1.prepareGetHeaders)(config.getExportRequestHeaders);
        }
        else {
            // noop
            this._beforeSend = function () { };
        }
    }
    /**
     * Export spans.
     */
    export(spans, resultCallback) {
        const serviceName = String(this._serviceName ||
            spans[0].resource.attributes[semantic_conventions_1.ATTR_SERVICE_NAME] ||
            this.DEFAULT_SERVICE_NAME);
        api_1.diag.debug('Zipkin exporter export');
        if (this._isShutdown) {
            setTimeout(() => resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new Error('Exporter has been shutdown'),
            }));
            return;
        }
        const promise = new Promise(resolve => {
            this._sendSpans(spans, serviceName, result => {
                resolve();
                resultCallback(result);
            });
        });
        this._sendingPromises.push(promise);
        const popPromise = () => {
            const index = this._sendingPromises.indexOf(promise);
            void this._sendingPromises.splice(index, 1);
        };
        promise.then(popPromise, popPromise);
    }
    /**
     * Shutdown exporter. Noop operation in this exporter.
     */
    shutdown() {
        api_1.diag.debug('Zipkin exporter shutdown');
        this._isShutdown = true;
        return this.forceFlush();
    }
    /**
     * Exports any pending spans in exporter
     */
    forceFlush() {
        return new Promise((resolve, reject) => {
            Promise.all(this._sendingPromises).then(() => {
                resolve();
            }, reject);
        });
    }
    /**
     * if user defines getExportRequestHeaders in config then this will be called
     * every time before send, otherwise it will be replaced with noop in
     * constructor
     * @default noop
     */
    _beforeSend() {
        if (this._getHeaders) {
            this._send = (0, index_1.prepareSend)(this._urlStr, this._getHeaders());
        }
    }
    /**
     * Transform spans and sends to Zipkin service.
     */
    _sendSpans(spans, serviceName, done) {
        const zipkinSpans = spans.map(span => (0, transform_1.toZipkinSpan)(span, String(span.attributes[semantic_conventions_1.ATTR_SERVICE_NAME] ||
            span.resource.attributes[semantic_conventions_1.ATTR_SERVICE_NAME] ||
            serviceName), this._statusCodeTagName, this._statusDescriptionTagName));
        this._beforeSend();
        return this._send(zipkinSpans, (result) => {
            if (done) {
                return done(result);
            }
        });
    }
}
exports.ZipkinExporter = ZipkinExporter;
//# sourceMappingURL=zipkin.js.map