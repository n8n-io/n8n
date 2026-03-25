/*
 * Custom metrics.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/
 */

/**
 * Custom metric.
 */
export abstract class Metric {
    protected __brand: never;

    /**
     * @param name - Metric name.
     * @param isTime - Whether values are time values.
     */
    constructor(name: string, isTime?: boolean);

    /** The name of the custom metric. */
    name: string;

    /**
     * Add value.
     * @param value - Value to add.
     * @param tags - Tags to attach to data point.
     */
    add(value: number | boolean, tags?: { [name: string]: string }): void;
}

/**
 * Cumulative counter.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/counter/
 *
 * @example
 * // Create instance on init context
 * const myCounter = new Counter('metricName');
 * export default function() {
 *   myCounter.add(1);
 * }
 */
export class Counter extends Metric {
    protected __brand: never;
}

/**
 * Gauge. Holds only latest value.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/gauge/
 */
export class Gauge extends Metric {
    protected __brand: never;
}

/**
 * Tracks percentage of nonzero values.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/rate/
 */
export class Rate extends Metric {
    protected __brand: never;
}

/**
 * Calculates summary statistics.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/trend/
 */
export class Trend extends Metric {
    protected __brand: never;
}
