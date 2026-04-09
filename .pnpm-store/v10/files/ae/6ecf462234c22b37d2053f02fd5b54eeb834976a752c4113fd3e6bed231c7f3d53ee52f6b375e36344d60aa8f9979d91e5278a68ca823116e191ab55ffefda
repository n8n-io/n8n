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
import { OTLPExporterBase } from '../../OTLPExporterBase';
import { configureCompression } from './util';
import { diag } from '@opentelemetry/api';
import { getEnv, baggageUtils } from '@opentelemetry/core';
import { createHttpExporterTransport } from './http-exporter-transport';
import { OTLPExporterError } from '../../types';
import { createRetryingTransport } from '../../retrying-transport';
/**
 * Collector Metric Exporter abstract base class
 */
export class OTLPExporterNodeBase extends OTLPExporterBase {
    constructor(config = {}, serializer, signalSpecificHeaders) {
        var _a;
        super(config);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (config.metadata) {
            diag.warn('Metadata cannot be set when using http');
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
        const nonSignalSpecificHeaders = baggageUtils.parseKeyPairsIntoRecord(getEnv().OTEL_EXPORTER_OTLP_HEADERS);
        this._transport = createRetryingTransport({
            transport: createHttpExporterTransport({
                agentOptions: (_a = config.httpAgentOptions) !== null && _a !== void 0 ? _a : { keepAlive: true },
                compression: configureCompression(config.compression),
                headers: Object.assign({}, nonSignalSpecificHeaders, signalSpecificHeaders),
                url: this.url,
            }),
        });
    }
    onInit(_config) { }
    send(objects, onSuccess, onError) {
        if (this._shutdownOnce.isCalled) {
            diag.debug('Shutdown already started. Cannot send objects');
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
                onError(new OTLPExporterError('Export failed with retryable status'));
            }
            else {
                onError(new OTLPExporterError('Export failed with unknown error'));
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
//# sourceMappingURL=OTLPExporterNodeBase.js.map