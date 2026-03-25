import { MetricProducer } from '@opentelemetry/sdk-metrics';
/**
 * Configuration interface for prometheus exporter
 */
export interface ExporterConfig {
    /**
     * App prefix for metrics, if needed
     *
     * @default ''
     * */
    prefix?: string;
    /**
     * Append timestamp to metrics
     * @default true
     */
    appendTimestamp?: boolean;
    /**
     * Endpoint the metrics should be exposed at with preceding slash
     * @default '/metrics'
     */
    endpoint?: string;
    /**
     * @default undefined (all interfaces)
     */
    host?: string;
    /**
     * Port number for Prometheus exporter server
     *
     * Default registered port is 9464:
     * https://github.com/prometheus/prometheus/wiki/Default-port-allocations
     * @default 9464
     */
    port?: number;
    /**
     * Prevent the Prometheus exporter server from starting
     * @default false
     */
    preventServerStart?: boolean;
    /**
     * **Note, this option is experimental**. Additional MetricProducers to use as a source of
     * aggregated metric data in addition to the SDK's metric data. The resource returned by
     * these MetricProducers is ignored; the SDK's resource will be used instead.
     * @experimental
     */
    metricProducers?: MetricProducer[];
    /**
     * Regex pattern for defining which resource attributes will be applied
     * as constant labels to the metrics.
     * e.g. 'telemetry_.+' for all attributes starting with 'telemetry'.
     * @default undefined (no resource attributes are applied)
     */
    withResourceConstantLabels?: RegExp;
}
//# sourceMappingURL=types.d.ts.map