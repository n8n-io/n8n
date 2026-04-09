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
exports.OTLPExporterBrowserBase = void 0;
const OTLPExporterBase_1 = require("../../OTLPExporterBase");
const types_1 = require("../../types");
const util_1 = require("../../util");
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const xhr_transport_1 = require("./xhr-transport");
const send_beacon_transport_1 = require("./send-beacon-transport");
const retrying_transport_1 = require("../../retrying-transport");
/**
 * Collector Metric Exporter abstract base class
 */
class OTLPExporterBrowserBase extends OTLPExporterBase_1.OTLPExporterBase {
    /**
     * @param config
     * @param serializer
     * @param contentType
     */
    constructor(config = {}, serializer, contentType) {
        super(config);
        this._serializer = serializer;
        const useXhr = !!config.headers || typeof navigator.sendBeacon !== 'function';
        if (useXhr) {
            this._transport = (0, retrying_transport_1.createRetryingTransport)({
                transport: (0, xhr_transport_1.createXhrTransport)({
                    headers: Object.assign({}, (0, util_1.parseHeaders)(config.headers), core_1.baggageUtils.parseKeyPairsIntoRecord((0, core_1.getEnv)().OTEL_EXPORTER_OTLP_HEADERS), { 'Content-Type': contentType }),
                    url: this.url,
                }),
            });
        }
        else {
            // sendBeacon has no way to signal retry, so we do not wrap it in a RetryingTransport
            this._transport = (0, send_beacon_transport_1.createSendBeaconTransport)({
                url: this.url,
                blobType: contentType,
            });
        }
    }
    onInit() { }
    onShutdown() { }
    send(objects, onSuccess, onError) {
        if (this._shutdownOnce.isCalled) {
            api_1.diag.debug('Shutdown already started. Cannot send objects');
            return;
        }
        const data = this._serializer.serializeRequest(objects);
        if (data == null) {
            onError(new Error('Could not serialize message'));
            return;
        }
        const promise = this._transport
            .send(data, this.timeoutMillis)
            .then(response => {
            if (response.status === 'success') {
                onSuccess();
            }
            else if (response.status === 'failure' && response.error) {
                onError(response.error);
            }
            else if (response.status === 'retryable') {
                onError(new types_1.OTLPExporterError('Export failed with retryable status'));
            }
            else {
                onError(new types_1.OTLPExporterError('Export failed with unknown error'));
            }
        }, onError);
        this._sendingPromises.push(promise);
        const popPromise = () => {
            const index = this._sendingPromises.indexOf(promise);
            this._sendingPromises.splice(index, 1);
        };
        promise.then(popPromise, popPromise);
    }
}
exports.OTLPExporterBrowserBase = OTLPExporterBrowserBase;
//# sourceMappingURL=OTLPExporterBrowserBase.js.map