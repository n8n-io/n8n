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
exports.MeterProvider = void 0;
const api_1 = require("@opentelemetry/api");
const resources_1 = require("@opentelemetry/resources");
const MeterProviderSharedState_1 = require("./state/MeterProviderSharedState");
const MetricCollector_1 = require("./state/MetricCollector");
/**
 * This class implements the {@link MeterProvider} interface.
 */
class MeterProvider {
    constructor(options) {
        var _a;
        this._shutdown = false;
        const resource = resources_1.Resource.default().merge((_a = options === null || options === void 0 ? void 0 : options.resource) !== null && _a !== void 0 ? _a : resources_1.Resource.empty());
        this._sharedState = new MeterProviderSharedState_1.MeterProviderSharedState(resource);
        if ((options === null || options === void 0 ? void 0 : options.views) != null && options.views.length > 0) {
            for (const view of options.views) {
                this._sharedState.viewRegistry.addView(view);
            }
        }
        if ((options === null || options === void 0 ? void 0 : options.readers) != null && options.readers.length > 0) {
            for (const metricReader of options.readers) {
                this.addMetricReader(metricReader);
            }
        }
    }
    /**
     * Get a meter with the configuration of the MeterProvider.
     */
    getMeter(name, version = '', options = {}) {
        // https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/metrics/sdk.md#meter-creation
        if (this._shutdown) {
            api_1.diag.warn('A shutdown MeterProvider cannot provide a Meter');
            return (0, api_1.createNoopMeter)();
        }
        return this._sharedState.getMeterSharedState({
            name,
            version,
            schemaUrl: options.schemaUrl,
        }).meter;
    }
    /**
     * Register a {@link MetricReader} to the meter provider. After the
     * registration, the MetricReader can start metrics collection.
     *
     * <p> NOTE: {@link MetricReader} instances MUST be added before creating any instruments.
     * A {@link MetricReader} instance registered later may receive no or incomplete metric data.
     *
     * @param metricReader the metric reader to be registered.
     *
     * @deprecated This method will be removed in SDK 2.0. Please use
     * {@link MeterProviderOptions.readers} via the {@link MeterProvider} constructor instead
     */
    addMetricReader(metricReader) {
        const collector = new MetricCollector_1.MetricCollector(this._sharedState, metricReader);
        metricReader.setMetricProducer(collector);
        this._sharedState.metricCollectors.push(collector);
    }
    /**
     * Flush all buffered data and shut down the MeterProvider and all registered
     * MetricReaders.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    async shutdown(options) {
        if (this._shutdown) {
            api_1.diag.warn('shutdown may only be called once per MeterProvider');
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
            api_1.diag.warn('invalid attempt to force flush after MeterProvider shutdown');
            return;
        }
        await Promise.all(this._sharedState.metricCollectors.map(collector => {
            return collector.forceFlush(options);
        }));
    }
}
exports.MeterProvider = MeterProvider;
//# sourceMappingURL=MeterProvider.js.map