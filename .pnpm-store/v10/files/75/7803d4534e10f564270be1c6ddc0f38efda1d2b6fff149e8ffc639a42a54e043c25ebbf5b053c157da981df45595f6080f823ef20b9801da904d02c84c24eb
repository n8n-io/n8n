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
exports.Meter = void 0;
const InstrumentDescriptor_1 = require("./InstrumentDescriptor");
const Instruments_1 = require("./Instruments");
/**
 * This class implements the {@link IMeter} interface.
 */
class Meter {
    constructor(_meterSharedState) {
        this._meterSharedState = _meterSharedState;
    }
    /**
     * Create a {@link Gauge} instrument.
     */
    createGauge(name, options) {
        const descriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(name, InstrumentDescriptor_1.InstrumentType.GAUGE, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new Instruments_1.GaugeInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Histogram} instrument.
     */
    createHistogram(name, options) {
        const descriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(name, InstrumentDescriptor_1.InstrumentType.HISTOGRAM, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new Instruments_1.HistogramInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Counter} instrument.
     */
    createCounter(name, options) {
        const descriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(name, InstrumentDescriptor_1.InstrumentType.COUNTER, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new Instruments_1.CounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link UpDownCounter} instrument.
     */
    createUpDownCounter(name, options) {
        const descriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(name, InstrumentDescriptor_1.InstrumentType.UP_DOWN_COUNTER, options);
        const storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new Instruments_1.UpDownCounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link ObservableGauge} instrument.
     */
    createObservableGauge(name, options) {
        const descriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(name, InstrumentDescriptor_1.InstrumentType.OBSERVABLE_GAUGE, options);
        const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new Instruments_1.ObservableGaugeInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableCounter} instrument.
     */
    createObservableCounter(name, options) {
        const descriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(name, InstrumentDescriptor_1.InstrumentType.OBSERVABLE_COUNTER, options);
        const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new Instruments_1.ObservableCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableUpDownCounter} instrument.
     */
    createObservableUpDownCounter(name, options) {
        const descriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(name, InstrumentDescriptor_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER, options);
        const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new Instruments_1.ObservableUpDownCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
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
exports.Meter = Meter;
//# sourceMappingURL=Meter.js.map