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
import { createInstrumentDescriptorWithView, } from '../InstrumentDescriptor';
import { Meter } from '../Meter';
import { isNotNullish } from '../utils';
import { AsyncMetricStorage } from './AsyncMetricStorage';
import { MetricStorageRegistry } from './MetricStorageRegistry';
import { MultiMetricStorage } from './MultiWritableMetricStorage';
import { ObservableRegistry } from './ObservableRegistry';
import { SyncMetricStorage } from './SyncMetricStorage';
import { AttributesProcessor } from '../view/AttributesProcessor';
/**
 * An internal record for shared meter provider states.
 */
export class MeterSharedState {
    constructor(_meterProviderSharedState, _instrumentationScope) {
        this._meterProviderSharedState = _meterProviderSharedState;
        this._instrumentationScope = _instrumentationScope;
        this.metricStorageRegistry = new MetricStorageRegistry();
        this.observableRegistry = new ObservableRegistry();
        this.meter = new Meter(this);
    }
    registerMetricStorage(descriptor) {
        const storages = this._registerMetricStorage(descriptor, SyncMetricStorage);
        if (storages.length === 1) {
            return storages[0];
        }
        return new MultiMetricStorage(storages);
    }
    registerAsyncMetricStorage(descriptor) {
        const storages = this._registerMetricStorage(descriptor, AsyncMetricStorage);
        return storages;
    }
    /**
     * @param collector opaque handle of {@link MetricCollector} which initiated the collection.
     * @param collectionTime the HrTime at which the collection was initiated.
     * @param options options for collection.
     * @returns the list of metric data collected.
     */
    async collect(collector, collectionTime, options) {
        /**
         * 1. Call all observable callbacks first.
         * 2. Collect metric result for the collector.
         */
        const errors = await this.observableRegistry.observe(collectionTime, options === null || options === void 0 ? void 0 : options.timeoutMillis);
        const storages = this.metricStorageRegistry.getStorages(collector);
        // prevent more allocations if there are no storages.
        if (storages.length === 0) {
            return null;
        }
        const metricDataList = storages
            .map(metricStorage => {
            return metricStorage.collect(collector, collectionTime);
        })
            .filter(isNotNullish);
        // skip this scope if no data was collected (storage created, but no data observed)
        if (metricDataList.length === 0) {
            return { errors };
        }
        return {
            scopeMetrics: {
                scope: this._instrumentationScope,
                metrics: metricDataList,
            },
            errors,
        };
    }
    _registerMetricStorage(descriptor, MetricStorageType) {
        const views = this._meterProviderSharedState.viewRegistry.findViews(descriptor, this._instrumentationScope);
        let storages = views.map(view => {
            const viewDescriptor = createInstrumentDescriptorWithView(view, descriptor);
            const compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleStorage(viewDescriptor);
            if (compatibleStorage != null) {
                return compatibleStorage;
            }
            const aggregator = view.aggregation.createAggregator(viewDescriptor);
            const viewStorage = new MetricStorageType(viewDescriptor, aggregator, view.attributesProcessor, this._meterProviderSharedState.metricCollectors);
            this.metricStorageRegistry.register(viewStorage);
            return viewStorage;
        });
        // Fallback to the per-collector aggregations if no view is configured for the instrument.
        if (storages.length === 0) {
            const perCollectorAggregations = this._meterProviderSharedState.selectAggregations(descriptor.type);
            const collectorStorages = perCollectorAggregations.map(([collector, aggregation]) => {
                const compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleCollectorStorage(collector, descriptor);
                if (compatibleStorage != null) {
                    return compatibleStorage;
                }
                const aggregator = aggregation.createAggregator(descriptor);
                const storage = new MetricStorageType(descriptor, aggregator, AttributesProcessor.Noop(), [collector]);
                this.metricStorageRegistry.registerForCollector(collector, storage);
                return storage;
            });
            storages = storages.concat(collectorStorages);
        }
        return storages;
    }
}
//# sourceMappingURL=MeterSharedState.js.map