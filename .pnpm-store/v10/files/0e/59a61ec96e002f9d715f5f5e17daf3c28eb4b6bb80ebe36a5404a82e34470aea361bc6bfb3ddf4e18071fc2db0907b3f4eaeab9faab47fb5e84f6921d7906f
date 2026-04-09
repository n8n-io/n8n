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
exports.BatchObservableResultImpl = exports.ObservableResultImpl = void 0;
const api_1 = require("@opentelemetry/api");
const HashMap_1 = require("./state/HashMap");
const Instruments_1 = require("./Instruments");
/**
 * The class implements {@link ObservableResult} interface.
 */
class ObservableResultImpl {
    constructor(_instrumentName, _valueType) {
        this._instrumentName = _instrumentName;
        this._valueType = _valueType;
        /**
         * @internal
         */
        this._buffer = new HashMap_1.AttributeHashMap();
    }
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(value, attributes = {}) {
        if (typeof value !== 'number') {
            api_1.diag.warn(`non-number value provided to metric ${this._instrumentName}: ${value}`);
            return;
        }
        if (this._valueType === api_1.ValueType.INT && !Number.isInteger(value)) {
            api_1.diag.warn(`INT value type cannot accept a floating-point value for ${this._instrumentName}, ignoring the fractional digits.`);
            value = Math.trunc(value);
            // ignore non-finite values.
            if (!Number.isInteger(value)) {
                return;
            }
        }
        this._buffer.set(attributes, value);
    }
}
exports.ObservableResultImpl = ObservableResultImpl;
/**
 * The class implements {@link BatchObservableCallback} interface.
 */
class BatchObservableResultImpl {
    constructor() {
        /**
         * @internal
         */
        this._buffer = new Map();
    }
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(metric, value, attributes = {}) {
        if (!(0, Instruments_1.isObservableInstrument)(metric)) {
            return;
        }
        let map = this._buffer.get(metric);
        if (map == null) {
            map = new HashMap_1.AttributeHashMap();
            this._buffer.set(metric, map);
        }
        if (typeof value !== 'number') {
            api_1.diag.warn(`non-number value provided to metric ${metric._descriptor.name}: ${value}`);
            return;
        }
        if (metric._descriptor.valueType === api_1.ValueType.INT &&
            !Number.isInteger(value)) {
            api_1.diag.warn(`INT value type cannot accept a floating-point value for ${metric._descriptor.name}, ignoring the fractional digits.`);
            value = Math.trunc(value);
            // ignore non-finite values.
            if (!Number.isInteger(value)) {
                return;
            }
        }
        map.set(attributes, value);
    }
}
exports.BatchObservableResultImpl = BatchObservableResultImpl;
//# sourceMappingURL=ObservableResult.js.map