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
/**
 * NoopMeter is a noop implementation of the {@link Meter} interface. It reuses
 * constant NoopMetrics for all of its methods.
 */
var NoopMeter = /** @class */ (function () {
    function NoopMeter() {
    }
    /**
     * @see {@link Meter.createGauge}
     */
    NoopMeter.prototype.createGauge = function (_name, _options) {
        return NOOP_GAUGE_METRIC;
    };
    /**
     * @see {@link Meter.createHistogram}
     */
    NoopMeter.prototype.createHistogram = function (_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
    };
    /**
     * @see {@link Meter.createCounter}
     */
    NoopMeter.prototype.createCounter = function (_name, _options) {
        return NOOP_COUNTER_METRIC;
    };
    /**
     * @see {@link Meter.createUpDownCounter}
     */
    NoopMeter.prototype.createUpDownCounter = function (_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
    };
    /**
     * @see {@link Meter.createObservableGauge}
     */
    NoopMeter.prototype.createObservableGauge = function (_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
    };
    /**
     * @see {@link Meter.createObservableCounter}
     */
    NoopMeter.prototype.createObservableCounter = function (_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
    };
    /**
     * @see {@link Meter.createObservableUpDownCounter}
     */
    NoopMeter.prototype.createObservableUpDownCounter = function (_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
    };
    /**
     * @see {@link Meter.addBatchObservableCallback}
     */
    NoopMeter.prototype.addBatchObservableCallback = function (_callback, _observables) { };
    /**
     * @see {@link Meter.removeBatchObservableCallback}
     */
    NoopMeter.prototype.removeBatchObservableCallback = function (_callback) { };
    return NoopMeter;
}());
export { NoopMeter };
var NoopMetric = /** @class */ (function () {
    function NoopMetric() {
    }
    return NoopMetric;
}());
export { NoopMetric };
var NoopCounterMetric = /** @class */ (function (_super) {
    __extends(NoopCounterMetric, _super);
    function NoopCounterMetric() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopCounterMetric.prototype.add = function (_value, _attributes) { };
    return NoopCounterMetric;
}(NoopMetric));
export { NoopCounterMetric };
var NoopUpDownCounterMetric = /** @class */ (function (_super) {
    __extends(NoopUpDownCounterMetric, _super);
    function NoopUpDownCounterMetric() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopUpDownCounterMetric.prototype.add = function (_value, _attributes) { };
    return NoopUpDownCounterMetric;
}(NoopMetric));
export { NoopUpDownCounterMetric };
var NoopGaugeMetric = /** @class */ (function (_super) {
    __extends(NoopGaugeMetric, _super);
    function NoopGaugeMetric() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopGaugeMetric.prototype.record = function (_value, _attributes) { };
    return NoopGaugeMetric;
}(NoopMetric));
export { NoopGaugeMetric };
var NoopHistogramMetric = /** @class */ (function (_super) {
    __extends(NoopHistogramMetric, _super);
    function NoopHistogramMetric() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopHistogramMetric.prototype.record = function (_value, _attributes) { };
    return NoopHistogramMetric;
}(NoopMetric));
export { NoopHistogramMetric };
var NoopObservableMetric = /** @class */ (function () {
    function NoopObservableMetric() {
    }
    NoopObservableMetric.prototype.addCallback = function (_callback) { };
    NoopObservableMetric.prototype.removeCallback = function (_callback) { };
    return NoopObservableMetric;
}());
export { NoopObservableMetric };
var NoopObservableCounterMetric = /** @class */ (function (_super) {
    __extends(NoopObservableCounterMetric, _super);
    function NoopObservableCounterMetric() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return NoopObservableCounterMetric;
}(NoopObservableMetric));
export { NoopObservableCounterMetric };
var NoopObservableGaugeMetric = /** @class */ (function (_super) {
    __extends(NoopObservableGaugeMetric, _super);
    function NoopObservableGaugeMetric() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return NoopObservableGaugeMetric;
}(NoopObservableMetric));
export { NoopObservableGaugeMetric };
var NoopObservableUpDownCounterMetric = /** @class */ (function (_super) {
    __extends(NoopObservableUpDownCounterMetric, _super);
    function NoopObservableUpDownCounterMetric() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return NoopObservableUpDownCounterMetric;
}(NoopObservableMetric));
export { NoopObservableUpDownCounterMetric };
export var NOOP_METER = new NoopMeter();
// Synchronous instruments
export var NOOP_COUNTER_METRIC = new NoopCounterMetric();
export var NOOP_GAUGE_METRIC = new NoopGaugeMetric();
export var NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
export var NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
// Asynchronous instruments
export var NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
export var NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
export var NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
/**
 * Create a no-op Meter
 */
export function createNoopMeter() {
    return NOOP_METER;
}
//# sourceMappingURL=NoopMeter.js.map