/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag, ValueType, } from '@opentelemetry/api';
import { AttributeHashMap } from './state/HashMap';
import { isObservableInstrument } from './Instruments';
/**
 * The class implements {@link ObservableResult} interface.
 */
export class ObservableResultImpl {
    /**
     * @internal
     */
    _buffer = new AttributeHashMap();
    _instrumentName;
    _valueType;
    constructor(instrumentName, valueType) {
        this._instrumentName = instrumentName;
        this._valueType = valueType;
    }
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(value, attributes = {}) {
        if (typeof value !== 'number') {
            diag.warn(`non-number value provided to metric ${this._instrumentName}: ${value}`);
            return;
        }
        if (this._valueType === ValueType.INT && !Number.isInteger(value)) {
            diag.warn(`INT value type cannot accept a floating-point value for ${this._instrumentName}, ignoring the fractional digits.`);
            value = Math.trunc(value);
            // ignore non-finite values.
            if (!Number.isInteger(value)) {
                return;
            }
        }
        this._buffer.set(attributes, value);
    }
}
/**
 * The class implements {@link BatchObservableCallback} interface.
 */
export class BatchObservableResultImpl {
    /**
     * @internal
     */
    _buffer = new Map();
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(metric, value, attributes = {}) {
        if (!isObservableInstrument(metric)) {
            return;
        }
        let map = this._buffer.get(metric);
        if (map == null) {
            map = new AttributeHashMap();
            this._buffer.set(metric, map);
        }
        if (typeof value !== 'number') {
            diag.warn(`non-number value provided to metric ${metric._descriptor.name}: ${value}`);
            return;
        }
        if (metric._descriptor.valueType === ValueType.INT &&
            !Number.isInteger(value)) {
            diag.warn(`INT value type cannot accept a floating-point value for ${metric._descriptor.name}, ignoring the fractional digits.`);
            value = Math.trunc(value);
            // ignore non-finite values.
            if (!Number.isInteger(value)) {
                return;
            }
        }
        map.set(attributes, value);
    }
}
//# sourceMappingURL=ObservableResult.js.map