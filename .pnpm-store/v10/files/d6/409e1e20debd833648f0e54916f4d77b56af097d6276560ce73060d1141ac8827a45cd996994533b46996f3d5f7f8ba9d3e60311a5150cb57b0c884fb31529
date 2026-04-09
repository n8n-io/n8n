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
exports.OTLPExporterNodeBase = void 0;
const OTLPExporterBase_1 = require("../../OTLPExporterBase");
const util_1 = require("./util");
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const http_exporter_transport_1 = require("./http-exporter-transport");
const types_1 = require("../../types");
const retrying_transport_1 = require("../../retrying-transport");
/**
 * Collector Metric Exporter abstract base class
 */
class OTLPExporterNodeBase extends OTLPExporterBase_1.OTLPExporterBase {
    constructor(config = {}, serializer, signalSpecificHeaders) {
        var _a;
        super(config);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (config.metadata) {
            api_1.diag.warn('Metadata cannot be set when using http');
        }
        this._serializer = serializer;
        // populate keepAlive for use with new settings
        if ((config === null || config === void 0 ? void 0 : config.keepAlive) != null) {
            if (config.httpAgentOptions != null) {
                if (config.httpAgentOptions.keepAlive == null) {
                    // specific setting is not set, populate with non-specific setting.
                    config.httpAgentOptions.keepAlive = config.keepAlive;
                }
                // do nothing, use specific setting otherwise
            }
            else {
                // populate specific option if AgentOptions does not exist.
                config.httpAgentOptions = {
                    keepAlive: config.keepAlive,
                };
            }
        }
        const nonSignalSpecificHeaders = core_1.baggageUtils.parseKeyPairsIntoRecord((0, core_1.getEnv)().OTEL_EXPORTER_OTLP_HEADERS);
        this._transport = (0, retrying_transport_1.createRetryingTransport)({
            transport: (0, http_exporter_transport_1.createHttpExporterTransport)({
                agentOptions: (_a = config.httpAgentOptions) !== null && _a !== void 0 ? _a : { keepAlive: true },
                compression: (0, util_1.configureCompression)(config.compression),
                headers: Object.assign({}, nonSignalSpecificHeaders, signalSpecificHeaders),
                url: this.url,
            }),
        });
    }
    onInit(_config) { }
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
    onShutdown() { }
}
exports.OTLPExporterNodeBase = OTLPExporterNodeBase;
//# sourceMappingURL=OTLPExporterNodeBase.js.map