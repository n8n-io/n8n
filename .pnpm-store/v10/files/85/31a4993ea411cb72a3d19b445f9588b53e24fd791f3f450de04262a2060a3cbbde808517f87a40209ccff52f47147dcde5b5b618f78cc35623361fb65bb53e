/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { getStringFromEnv } from '@opentelemetry/core';
import { AggregationTemporality, InstrumentType, AggregationType, } from '@opentelemetry/sdk-metrics';
import { AggregationTemporalityPreference, } from './OTLPMetricExporterOptions';
import { OTLPExporterBase, } from '@opentelemetry/otlp-exporter-base';
import { diag } from '@opentelemetry/api';
export const CumulativeTemporalitySelector = () => AggregationTemporality.CUMULATIVE;
export const DeltaTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
        case InstrumentType.COUNTER:
        case InstrumentType.OBSERVABLE_COUNTER:
        case InstrumentType.GAUGE:
        case InstrumentType.HISTOGRAM:
        case InstrumentType.OBSERVABLE_GAUGE:
            return AggregationTemporality.DELTA;
        case InstrumentType.UP_DOWN_COUNTER:
        case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
            return AggregationTemporality.CUMULATIVE;
    }
};
export const LowMemoryTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
        case InstrumentType.COUNTER:
        case InstrumentType.HISTOGRAM:
            return AggregationTemporality.DELTA;
        case InstrumentType.GAUGE:
        case InstrumentType.UP_DOWN_COUNTER:
        case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
        case InstrumentType.OBSERVABLE_COUNTER:
        case InstrumentType.OBSERVABLE_GAUGE:
            return AggregationTemporality.CUMULATIVE;
    }
};
function chooseTemporalitySelectorFromEnvironment() {
    const configuredTemporality = (getStringFromEnv('OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE') ??
        'cumulative').toLowerCase();
    if (configuredTemporality === 'cumulative') {
        return CumulativeTemporalitySelector;
    }
    if (configuredTemporality === 'delta') {
        return DeltaTemporalitySelector;
    }
    if (configuredTemporality === 'lowmemory') {
        return LowMemoryTemporalitySelector;
    }
    diag.warn(`OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE is set to '${configuredTemporality}', but only 'cumulative' and 'delta' are allowed. Using default ('cumulative') instead.`);
    return CumulativeTemporalitySelector;
}
function chooseTemporalitySelector(temporalityPreference) {
    // Directly passed preference has priority.
    if (temporalityPreference != null) {
        if (temporalityPreference === AggregationTemporalityPreference.DELTA) {
            return DeltaTemporalitySelector;
        }
        else if (temporalityPreference === AggregationTemporalityPreference.LOWMEMORY) {
            return LowMemoryTemporalitySelector;
        }
        return CumulativeTemporalitySelector;
    }
    return chooseTemporalitySelectorFromEnvironment();
}
const DEFAULT_AGGREGATION = Object.freeze({
    type: AggregationType.DEFAULT,
});
function chooseAggregationSelector(config) {
    return config?.aggregationPreference ?? (() => DEFAULT_AGGREGATION);
}
export class OTLPMetricExporterBase extends OTLPExporterBase {
    _aggregationTemporalitySelector;
    _aggregationSelector;
    constructor(delegate, config) {
        super(delegate);
        this._aggregationSelector = chooseAggregationSelector(config);
        this._aggregationTemporalitySelector = chooseTemporalitySelector(config?.temporalityPreference);
    }
    selectAggregation(instrumentType) {
        return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
        return this._aggregationTemporalitySelector(instrumentType);
    }
}
//# sourceMappingURL=OTLPMetricExporterBase.js.map