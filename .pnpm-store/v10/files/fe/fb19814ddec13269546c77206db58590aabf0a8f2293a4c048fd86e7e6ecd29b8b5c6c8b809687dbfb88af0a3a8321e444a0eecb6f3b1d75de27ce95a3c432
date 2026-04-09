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
import { createInstrumentDescriptor, InstrumentType, } from './InstrumentDescriptor';
import { CounterInstrument, GaugeInstrument, HistogramInstrument, ObservableCounterInstrument, ObservableGaugeInstrument, ObservableUpDownCounterInstrument, UpDownCounterInstrument, } from './Instruments';
/**
 * This class implements the {@link IMeter} interface.
 */
var Meter = /** @class */ (function () {
    function Meter(_meterSharedState) {
        this._meterSharedState = _meterSharedState;
    }
    /**
     * Create a {@link Gauge} instrument.
     */
    Meter.prototype.createGauge = function (name, options) {
        var descriptor = createInstrumentDescriptor(name, InstrumentType.GAUGE, options);
        var storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new GaugeInstrument(storage, descriptor);
    };
    /**
     * Create a {@link Histogram} instrument.
     */
    Meter.prototype.createHistogram = function (name, options) {
        var descriptor = createInstrumentDescriptor(name, InstrumentType.HISTOGRAM, options);
        var storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new HistogramInstrument(storage, descriptor);
    };
    /**
     * Create a {@link Counter} instrument.
     */
    Meter.prototype.createCounter = function (name, options) {
        var descriptor = createInstrumentDescriptor(name, InstrumentType.COUNTER, options);
        var storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new CounterInstrument(storage, descriptor);
    };
    /**
     * Create a {@link UpDownCounter} instrument.
     */
    Meter.prototype.createUpDownCounter = function (name, options) {
        var descriptor = createInstrumentDescriptor(name, InstrumentType.UP_DOWN_COUNTER, options);
        var storage = this._meterSharedState.registerMetricStorage(descriptor);
        return new UpDownCounterInstrument(storage, descriptor);
    };
    /**
     * Create a {@link ObservableGauge} instrument.
     */
    Meter.prototype.createObservableGauge = function (name, options) {
        var descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_GAUGE, options);
        var storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new ObservableGaugeInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    };
    /**
     * Create a {@link ObservableCounter} instrument.
     */
    Meter.prototype.createObservableCounter = function (name, options) {
        var descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_COUNTER, options);
        var storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new ObservableCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    };
    /**
     * Create a {@link ObservableUpDownCounter} instrument.
     */
    Meter.prototype.createObservableUpDownCounter = function (name, options) {
        var descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_UP_DOWN_COUNTER, options);
        var storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
        return new ObservableUpDownCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    };
    /**
     * @see {@link Meter.addBatchObservableCallback}
     */
    Meter.prototype.addBatchObservableCallback = function (callback, observables) {
        this._meterSharedState.observableRegistry.addBatchCallback(callback, observables);
    };
    /**
     * @see {@link Meter.removeBatchObservableCallback}
     */
    Meter.prototype.removeBatchObservableCallback = function (callback, observables) {
        this._meterSharedState.observableRegistry.removeBatchCallback(callback, observables);
    };
    return Meter;
}());
export { Meter };
//# sourceMappingURL=Meter.js.map