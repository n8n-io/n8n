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
/**
 * NoopMeter is a noop implementation of the {@link Meter} interface. It reuses
 * constant NoopMetrics for all of its methods.
 */
export class NoopMeter {
    constructor() { }
    /**
     * @see {@link Meter.createGauge}
     */
    createGauge(_name, _options) {
        return NOOP_GAUGE_METRIC;
    }
    /**
     * @see {@link Meter.createHistogram}
     */
    createHistogram(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
    }
    /**
     * @see {@link Meter.createCounter}
     */
    createCounter(_name, _options) {
        return NOOP_COUNTER_METRIC;
    }
    /**
     * @see {@link Meter.createUpDownCounter}
     */
    createUpDownCounter(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
    }
    /**
     * @see {@link Meter.createObservableGauge}
     */
    createObservableGauge(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
    }
    /**
     * @see {@link Meter.createObservableCounter}
     */
    createObservableCounter(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
    }
    /**
     * @see {@link Meter.createObservableUpDownCounter}
     */
    createObservableUpDownCounter(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
    }
    /**
     * @see {@link Meter.addBatchObservableCallback}
     */
    addBatchObservableCallback(_callback, _observables) { }
    /**
     * @see {@link Meter.removeBatchObservableCallback}
     */
    removeBatchObservableCallback(_callback) { }
}
export class NoopMetric {
}
export class NoopCounterMetric extends NoopMetric {
    add(_value, _attributes) { }
}
export class NoopUpDownCounterMetric extends NoopMetric {
    add(_value, _attributes) { }
}
export class NoopGaugeMetric extends NoopMetric {
    record(_value, _attributes) { }
}
export class NoopHistogramMetric extends NoopMetric {
    record(_value, _attributes) { }
}
export class NoopObservableMetric {
    addCallback(_callback) { }
    removeCallback(_callback) { }
}
export class NoopObservableCounterMetric extends NoopObservableMetric {
}
export class NoopObservableGaugeMetric extends NoopObservableMetric {
}
export class NoopObservableUpDownCounterMetric extends NoopObservableMetric {
}
export const NOOP_METER = new NoopMeter();
// Synchronous instruments
export const NOOP_COUNTER_METRIC = new NoopCounterMetric();
export const NOOP_GAUGE_METRIC = new NoopGaugeMetric();
export const NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
export const NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
// Asynchronous instruments
export const NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
export const NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
export const NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
/**
 * Create a no-op Meter
 */
export function createNoopMeter() {
    return NOOP_METER;
}
//# sourceMappingURL=NoopMeter.js.map