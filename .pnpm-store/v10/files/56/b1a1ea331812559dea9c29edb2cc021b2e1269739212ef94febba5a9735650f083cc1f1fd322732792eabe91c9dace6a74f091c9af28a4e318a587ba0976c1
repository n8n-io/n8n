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
exports.isObservableInstrument = exports.ObservableUpDownCounterInstrument = exports.ObservableGaugeInstrument = exports.ObservableCounterInstrument = exports.ObservableInstrument = exports.HistogramInstrument = exports.GaugeInstrument = exports.CounterInstrument = exports.UpDownCounterInstrument = exports.SyncInstrument = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
class SyncInstrument {
    _writableMetricStorage;
    _descriptor;
    constructor(_writableMetricStorage, _descriptor) {
        this._writableMetricStorage = _writableMetricStorage;
        this._descriptor = _descriptor;
    }
    _record(value, attributes = {}, context = api_1.context.active()) {
        if (typeof value !== 'number') {
            api_1.diag.warn(`non-number value provided to metric ${this._descriptor.name}: ${value}`);
            return;
        }
        if (this._descriptor.valueType === api_1.ValueType.INT &&
            !Number.isInteger(value)) {
            api_1.diag.warn(`INT value type cannot accept a floating-point value for ${this._descriptor.name}, ignoring the fractional digits.`);
            value = Math.trunc(value);
            // ignore non-finite values.
            if (!Number.isInteger(value)) {
                return;
            }
        }
        this._writableMetricStorage.record(value, attributes, context, (0, core_1.millisToHrTime)(Date.now()));
    }
}
exports.SyncInstrument = SyncInstrument;
/**
 * The class implements {@link UpDownCounter} interface.
 */
class UpDownCounterInstrument extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may be negative.
     */
    add(value, attributes, ctx) {
        this._record(value, attributes, ctx);
    }
}
exports.UpDownCounterInstrument = UpDownCounterInstrument;
/**
 * The class implements {@link Counter} interface.
 */
class CounterInstrument extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may not be negative.
     */
    add(value, attributes, ctx) {
        if (value < 0) {
            api_1.diag.warn(`negative value provided to counter ${this._descriptor.name}: ${value}`);
            return;
        }
        this._record(value, attributes, ctx);
    }
}
exports.CounterInstrument = CounterInstrument;
/**
 * The class implements {@link Gauge} interface.
 */
class GaugeInstrument extends SyncInstrument {
    /**
     * Records a measurement.
     */
    record(value, attributes, ctx) {
        this._record(value, attributes, ctx);
    }
}
exports.GaugeInstrument = GaugeInstrument;
/**
 * The class implements {@link Histogram} interface.
 */
class HistogramInstrument extends SyncInstrument {
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    record(value, attributes, ctx) {
        if (value < 0) {
            api_1.diag.warn(`negative value provided to histogram ${this._descriptor.name}: ${value}`);
            return;
        }
        this._record(value, attributes, ctx);
    }
}
exports.HistogramInstrument = HistogramInstrument;
class ObservableInstrument {
    _observableRegistry;
    /** @internal */
    _metricStorages;
    /** @internal */
    _descriptor;
    constructor(descriptor, metricStorages, _observableRegistry) {
        this._observableRegistry = _observableRegistry;
        this._descriptor = descriptor;
        this._metricStorages = metricStorages;
    }
    /**
     * @see {Observable.addCallback}
     */
    addCallback(callback) {
        this._observableRegistry.addCallback(callback, this);
    }
    /**
     * @see {Observable.removeCallback}
     */
    removeCallback(callback) {
        this._observableRegistry.removeCallback(callback, this);
    }
}
exports.ObservableInstrument = ObservableInstrument;
class ObservableCounterInstrument extends ObservableInstrument {
}
exports.ObservableCounterInstrument = ObservableCounterInstrument;
class ObservableGaugeInstrument extends ObservableInstrument {
}
exports.ObservableGaugeInstrument = ObservableGaugeInstrument;
class ObservableUpDownCounterInstrument extends ObservableInstrument {
}
exports.ObservableUpDownCounterInstrument = ObservableUpDownCounterInstrument;
function isObservableInstrument(it) {
    return it instanceof ObservableInstrument;
}
exports.isObservableInstrument = isObservableInstrument;
//# sourceMappingURL=Instruments.js.map