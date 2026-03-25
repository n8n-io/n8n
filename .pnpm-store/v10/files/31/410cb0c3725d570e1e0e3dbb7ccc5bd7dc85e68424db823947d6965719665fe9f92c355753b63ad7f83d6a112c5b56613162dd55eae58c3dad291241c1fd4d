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
import { diag, createNoopMeter, } from '@opentelemetry/api';
import { defaultResource } from '@opentelemetry/resources';
import { MeterProviderSharedState } from './state/MeterProviderSharedState';
import { MetricCollector } from './state/MetricCollector';
import { View } from './view/View';
/**
 * This class implements the {@link MeterProvider} interface.
 */
export class MeterProvider {
    _sharedState;
    _shutdown = false;
    constructor(options) {
        this._sharedState = new MeterProviderSharedState(options?.resource ?? defaultResource());
        if (options?.views != null && options.views.length > 0) {
            for (const viewOption of options.views) {
                this._sharedState.viewRegistry.addView(new View(viewOption));
            }
        }
        if (options?.readers != null && options.readers.length > 0) {
            for (const metricReader of options.readers) {
                const collector = new MetricCollector(this._sharedState, metricReader);
                metricReader.setMetricProducer(collector);
                this._sharedState.metricCollectors.push(collector);
            }
        }
    }
    /**
     * Get a meter with the configuration of the MeterProvider.
     */
    getMeter(name, version = '', options = {}) {
        // https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/metrics/sdk.md#meter-creation
        if (this._shutdown) {
            diag.warn('A shutdown MeterProvider cannot provide a Meter');
            return createNoopMeter();
        }
        return this._sharedState.getMeterSharedState({
            name,
            version,
            schemaUrl: options.schemaUrl,
        }).meter;
    }
    /**
     * Shut down the MeterProvider and all registered
     * MetricReaders.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    async shutdown(options) {
        if (this._shutdown) {
            diag.warn('shutdown may only be called once per MeterProvider');
            return;
        }
        this._shutdown = true;
        await Promise.all(this._sharedState.metricCollectors.map(collector => {
            return collector.shutdown(options);
        }));
    }
    /**
     * Notifies all registered MetricReaders to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    async forceFlush(options) {
        // do not flush after shutdown
        if (this._shutdown) {
            diag.warn('invalid attempt to force flush after MeterProvider shutdown');
            return;
        }
        await Promise.all(this._sharedState.metricCollectors.map(collector => {
            return collector.forceFlush(options);
        }));
    }
}
//# sourceMappingURL=MeterProvider.js.map