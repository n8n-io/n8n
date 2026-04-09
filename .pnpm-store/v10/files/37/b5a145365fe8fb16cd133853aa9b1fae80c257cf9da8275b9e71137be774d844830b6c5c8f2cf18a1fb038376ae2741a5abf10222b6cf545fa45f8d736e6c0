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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { context as contextApi, diag, ValueType, } from '@opentelemetry/api';
import { millisToHrTime } from '@opentelemetry/core';
var SyncInstrument = /** @class */ (function () {
    function SyncInstrument(_writableMetricStorage, _descriptor) {
        this._writableMetricStorage = _writableMetricStorage;
        this._descriptor = _descriptor;
    }
    SyncInstrument.prototype._record = function (value, attributes, context) {
        if (attributes === void 0) { attributes = {}; }
        if (context === void 0) { context = contextApi.active(); }
        if (typeof value !== 'number') {
            diag.warn("non-number value provided to metric " + this._descriptor.name + ": " + value);
            return;
        }
        if (this._descriptor.valueType === ValueType.INT &&
            !Number.isInteger(value)) {
            diag.warn("INT value type cannot accept a floating-point value for " + this._descriptor.name + ", ignoring the fractional digits.");
            value = Math.trunc(value);
            // ignore non-finite values.
            if (!Number.isInteger(value)) {
                return;
            }
        }
        this._writableMetricStorage.record(value, attributes, context, millisToHrTime(Date.now()));
    };
    return SyncInstrument;
}());
export { SyncInstrument };
/**
 * The class implements {@link UpDownCounter} interface.
 */
var UpDownCounterInstrument = /** @class */ (function (_super) {
    __extends(UpDownCounterInstrument, _super);
    function UpDownCounterInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Increment value of counter by the input. Inputs may be negative.
     */
    UpDownCounterInstrument.prototype.add = function (value, attributes, ctx) {
        this._record(value, attributes, ctx);
    };
    return UpDownCounterInstrument;
}(SyncInstrument));
export { UpDownCounterInstrument };
/**
 * The class implements {@link Counter} interface.
 */
var CounterInstrument = /** @class */ (function (_super) {
    __extends(CounterInstrument, _super);
    function CounterInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Increment value of counter by the input. Inputs may not be negative.
     */
    CounterInstrument.prototype.add = function (value, attributes, ctx) {
        if (value < 0) {
            diag.warn("negative value provided to counter " + this._descriptor.name + ": " + value);
            return;
        }
        this._record(value, attributes, ctx);
    };
    return CounterInstrument;
}(SyncInstrument));
export { CounterInstrument };
/**
 * The class implements {@link Gauge} interface.
 */
var GaugeInstrument = /** @class */ (function (_super) {
    __extends(GaugeInstrument, _super);
    function GaugeInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Records a measurement.
     */
    GaugeInstrument.prototype.record = function (value, attributes, ctx) {
        this._record(value, attributes, ctx);
    };
    return GaugeInstrument;
}(SyncInstrument));
export { GaugeInstrument };
/**
 * The class implements {@link Histogram} interface.
 */
var HistogramInstrument = /** @class */ (function (_super) {
    __extends(HistogramInstrument, _super);
    function HistogramInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    HistogramInstrument.prototype.record = function (value, attributes, ctx) {
        if (value < 0) {
            diag.warn("negative value provided to histogram " + this._descriptor.name + ": " + value);
            return;
        }
        this._record(value, attributes, ctx);
    };
    return HistogramInstrument;
}(SyncInstrument));
export { HistogramInstrument };
var ObservableInstrument = /** @class */ (function () {
    function ObservableInstrument(descriptor, metricStorages, _observableRegistry) {
        this._observableRegistry = _observableRegistry;
        this._descriptor = descriptor;
        this._metricStorages = metricStorages;
    }
    /**
     * @see {Observable.addCallback}
     */
    ObservableInstrument.prototype.addCallback = function (callback) {
        this._observableRegistry.addCallback(callback, this);
    };
    /**
     * @see {Observable.removeCallback}
     */
    ObservableInstrument.prototype.removeCallback = function (callback) {
        this._observableRegistry.removeCallback(callback, this);
    };
    return ObservableInstrument;
}());
export { ObservableInstrument };
var ObservableCounterInstrument = /** @class */ (function (_super) {
    __extends(ObservableCounterInstrument, _super);
    function ObservableCounterInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ObservableCounterInstrument;
}(ObservableInstrument));
export { ObservableCounterInstrument };
var ObservableGaugeInstrument = /** @class */ (function (_super) {
    __extends(ObservableGaugeInstrument, _super);
    function ObservableGaugeInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ObservableGaugeInstrument;
}(ObservableInstrument));
export { ObservableGaugeInstrument };
var ObservableUpDownCounterInstrument = /** @class */ (function (_super) {
    __extends(ObservableUpDownCounterInstrument, _super);
    function ObservableUpDownCounterInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ObservableUpDownCounterInstrument;
}(ObservableInstrument));
export { ObservableUpDownCounterInstrument };
export function isObservableInstrument(it) {
    return it instanceof ObservableInstrument;
}
//# sourceMappingURL=Instruments.js.map