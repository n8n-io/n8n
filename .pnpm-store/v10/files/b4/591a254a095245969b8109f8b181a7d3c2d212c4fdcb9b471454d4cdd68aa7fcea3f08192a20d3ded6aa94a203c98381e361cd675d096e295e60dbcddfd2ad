/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { createInstrumentDescriptor } from './InstrumentDescriptor';
import { CounterInstrument, GaugeInstrument, HistogramInstrument, ObservableCounterInstrument, ObservableGaugeInstrument, ObservableUpDownCounterInstrument, UpDownCounterInstrument, } from './Instruments';
import { InstrumentType } from './export/MetricData';
/**
 * This class implements the {@link IMeter} interface.
 */
export class Meter {
    _meterSharedState;
    constructor(meterSharedState) {
        this._meterSharedState = meterSharedState;
    }
    /**
     * Create a {@link Gauge} instrument.
     */
    createGauge(name, options) {
        const descriptor = createInstrumentDescriptor(name, InstrumentType.GAUGE, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new GaugeInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Histogram} instrument.
     */
    createHistogram(name, options) {
        const descriptor = createInstrumentDescriptor(name, InstrumentType.HISTOGRAM, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new HistogramInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Counter} instrument.
     */
    createCounter(name, options) {
        const descriptor = createInstrumentDescriptor(name, InstrumentType.COUNTER, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new CounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link UpDownCounter} instrument.
     */
    createUpDownCounter(name, options) {
        const descriptor = createInstrumentDescriptor(name, InstrumentType.UP_DOWN_COUNTER, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new UpDownCounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link ObservableGauge} instrument.
     */
    createObservableGauge(name, options) {
        const descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_GAUGE, options);
        const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new ObservableGaugeInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableCounter} instrument.
     */
    createObservableCounter(name, options) {
        const descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_COUNTER, options);
        const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new ObservableCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableUpDownCounter} instrument.
     */
    createObservableUpDownCounter(name, options) {
        const descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_UP_DOWN_COUNTER, options);
        const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new ObservableUpDownCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * @see {@link Meter.addBatchObservableCallback}
     */
    addBatchObservableCallback(callback, observables) {
        this._meterSharedState.observableRegistry.addBatchCallback(callback, observables);
    }
    /**
     * @see {@link Meter.removeBatchObservableCallback}
     */
    removeBatchObservableCallback(callback, observables) {
        this._meterSharedState.observableRegistry.removeBatchCallback(callback, observables);
    }
}
//# sourceMappingURL=Meter.js.map