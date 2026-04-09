/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
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
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    _attributesProcessor;
    constructor(_instrumentDescriptor, aggregator, attributesProcessor, collectorHandles, aggregationCardinalityLimit) {
        super(_instrumentDescriptor);
        this._aggregationCardinalityLimit = aggregationCardinalityLimit;
        this._deltaMetricStorage = new DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
        this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
        this._attributesProcessor = attributesProcessor;
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