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
import { OTLPExporterError } from '../../types';
import { parseHeaders } from '../../util';
import { diag } from '@opentelemetry/api';
import { getEnv, baggageUtils } from '@opentelemetry/core';
import { createXhrTransport } from './xhr-transport';
import { createSendBeaconTransport } from './send-beacon-transport';
import { createRetryingTransport } from '../../retrying-transport';
/**
 * Collector Metric Exporter abstract base class
 */
export class OTLPExporterBrowserBase extends OTLPExporterBase {
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
            this._transport = createRetryingTransport({
                transport: createXhrTransport({
                    headers: Object.assign({}, parseHeaders(config.headers), baggageUtils.parseKeyPairsIntoRecord(getEnv().OTEL_EXPORTER_OTLP_HEADERS), { 'Content-Type': contentType }),
                    url: this.url,
                }),
            });
        }
        else {
            // sendBeacon has no way to signal retry, so we do not wrap it in a RetryingTransport
            this._transport = createSendBeaconTransport({
                url: this.url,
                blobType: contentType,
            });
        }
    }
    onInit() { }
    onShutdown() { }
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
}
//# sourceMappingURL=OTLPExporterBrowserBase.js.map