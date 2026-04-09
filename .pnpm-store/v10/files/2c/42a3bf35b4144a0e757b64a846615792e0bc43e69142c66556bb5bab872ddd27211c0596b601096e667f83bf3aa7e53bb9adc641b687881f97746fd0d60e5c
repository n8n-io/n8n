"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncMetricStorage = void 0;
const MetricStorage_1 = require("./MetricStorage");
const DeltaMetricProcessor_1 = require("./DeltaMetricProcessor");
const TemporalMetricProcessor_1 = require("./TemporalMetricProcessor");
/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for synchronous instruments.
 */
class SyncMetricStorage extends MetricStorage_1.MetricStorage {
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    _attributesProcessor;
    constructor(instrumentDescriptor, aggregator, attributesProcessor, collectorHandles, aggregationCardinalityLimit) {
        super(instrumentDescriptor);
        this._aggregationCardinalityLimit = aggregationCardinalityLimit;
        this._deltaMetricStorage = new DeltaMetricProcessor_1.DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
        this._temporalMetricStorage = new TemporalMetricProcessor_1.TemporalMetricProcessor(aggregator, collectorHandles);
        this._attributesProcessor = attributesProcessor;
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
exports.SyncMetricStorage = SyncMetricStorage;
//# sourceMappingURL=SyncMetricStorage.js.map