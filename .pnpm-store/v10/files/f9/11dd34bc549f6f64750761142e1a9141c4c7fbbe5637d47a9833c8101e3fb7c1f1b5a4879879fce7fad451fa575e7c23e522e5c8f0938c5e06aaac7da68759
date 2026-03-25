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
import { MetricStorage } from './MetricStorage';
import { DeltaMetricProcessor } from './DeltaMetricProcessor';
import { TemporalMetricProcessor } from './TemporalMetricProcessor';
import { AttributeHashMap } from './HashMap';
/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for asynchronous instruments.
 */
export class AsyncMetricStorage extends MetricStorage {
    _attributesProcessor;
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    constructor(_instrumentDescriptor, aggregator, _attributesProcessor, collectorHandles, _aggregationCardinalityLimit) {
        super(_instrumentDescriptor);
        this._attributesProcessor = _attributesProcessor;
        this._aggregationCardinalityLimit = _aggregationCardinalityLimit;
        this._deltaMetricStorage = new DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
        this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
    }
    record(measurements, observationTime) {
        const processed = new AttributeHashMap();
        Array.from(measurements.entries()).forEach(([attributes, value]) => {
            processed.set(this._attributesProcessor.process(attributes), value);
        });
        this._deltaMetricStorage.batchCumulate(processed, observationTime);
    }
    /**
     * Collects the metrics from this storage. The ObservableCallback is invoked
     * during the collection.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector, collectionTime) {
        const accumulations = this._deltaMetricStorage.collect();
        return this._temporalMetricStorage.buildMetrics(collector, this._instrumentDescriptor, accumulations, collectionTime);
    }
}
//# sourceMappingURL=AsyncMetricStorage.js.map