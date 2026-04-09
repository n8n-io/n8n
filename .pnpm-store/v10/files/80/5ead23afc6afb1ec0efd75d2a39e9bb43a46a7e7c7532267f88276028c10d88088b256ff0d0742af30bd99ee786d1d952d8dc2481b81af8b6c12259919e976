/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { context as contextApi, diag, ValueType, } from '@opentelemetry/api';
import { millisToHrTime } from '@opentelemetry/core';
export class SyncInstrument {
    _writableMetricStorage;
    _descriptor;
    constructor(writableMetricStorage, descriptor) {
        this._writableMetricStorage = writableMetricStorage;
        this._descriptor = descriptor;
    }
    _record(value, attributes = {}, context = contextApi.active()) {
        if (typeof value !== 'number') {
            diag.warn(`non-number value provided to metric ${this._descriptor.name}: ${value}`);
            return;
        }
        if (this._descriptor.valueType === ValueType.INT &&
            !Number.isInteger(value)) {
            diag.warn(`INT value type cannot accept a floating-point value for ${this._descriptor.name}, ignoring the fractional digits.`);
            value = Math.trunc(value);
            // ignore non-finite values.
            if (!Number.isInteger(value)) {
                return;
            }
        }
        this._writableMetricStorage.record(value, attributes, context, millisToHrTime(Date.now()));
    }
}
/**
 * The class implements {@link UpDownCounter} interface.
 */
export class UpDownCounterInstrument extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may be negative.
     */
    add(value, attributes, ctx) {
        this._record(value, attributes, ctx);
    }
}
/**
 * The class implements {@link Counter} interface.
 */
export class CounterInstrument extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may not be negative.
     */
    add(value, attributes, ctx) {
        if (value < 0) {
            diag.warn(`negative value provided to counter ${this._descriptor.name}: ${value}`);
            return;
        }
        this._record(value, attributes, ctx);
    }
}
/**
 * The class implements {@link Gauge} interface.
 */
export class GaugeInstrument extends SyncInstrument {
    /**
     * Records a measurement.
     */
    record(value, attributes, ctx) {
        this._record(value, attributes, ctx);
    }
}
/**
 * The class implements {@link Histogram} interface.
 */
export class HistogramInstrument extends SyncInstrument {
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    record(value, attributes, ctx) {
        if (value < 0) {
            diag.warn(`negative value provided to histogram ${this._descriptor.name}: ${value}`);
            return;
        }
        this._record(value, attributes, ctx);
    }
}
export class ObservableInstrument {
    /** @internal */
    _metricStorages;
    /** @internal */
    _descriptor;
    _observableRegistry;
    constructor(descriptor, metricStorages, observableRegistry) {
        this._descriptor = descriptor;
        this._metricStorages = metricStorages;
        this._observableRegistry = observableRegistry;
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
export class ObservableCounterInstrument extends ObservableInstrument {
}
export class ObservableGaugeInstrument extends ObservableInstrument {
}
export class ObservableUpDownCounterInstrument extends ObservableInstrument {
}
export function isObservableInstrument(it) {
    return it instanceof ObservableInstrument;
}
//# sourceMappingURL=Instruments.js.map