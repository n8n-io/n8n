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
/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for synchronous instruments.
 */
export class SyncMetricStorage extends MetricStorage {
    _attributesProcessor;
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    constructor(instrumentDescriptor, aggregator, _attributesProcessor, collectorHandles, _aggregationCardinalityLimit) {
        super(instrumentDescriptor);
        this._attributesProcessor = _attributesProcessor;
        this._aggregationCardinalityLimit = _aggregationCardinalityLimit;
        this._deltaMetricStorage = new DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
        this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
    }
    record(value, attributes, context, recordTime) {
        attributes = this._attributesProcessor.process(attributes, context);
        this._deltaMetricStorage.record(value, attributes, context, recordTime);
    }
    /**
     * Collects the metrics from this storage.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector, collectionTime) {
        const accumulations = this._deltaMetricStorage.collect();
        return this._temporalMetricStorage.buildMetrics(collector, this._instrumentDescriptor, accumulations, collectionTime);
    }
}
//# sourceMappingURL=SyncMetricStorage.js.map