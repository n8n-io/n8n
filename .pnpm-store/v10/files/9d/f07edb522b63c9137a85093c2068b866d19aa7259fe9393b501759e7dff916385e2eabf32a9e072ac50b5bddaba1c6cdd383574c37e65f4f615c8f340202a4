import { GrpcTls, HttpTls, IncludeExclude, NameStringValuePair, OtlpHttpEncoding } from './commonModel';
export declare function initializeDefaultMeterProviderConfiguration(): Required<MeterProvider>;
export interface MeterProvider {
    /**
     * Configure metric readers.
     */
    readers: MetricReader[];
    /**
     * Configure views.
     * Each view has a selector which determines the instrument(s) it applies to,
     * and a configuration for the resulting stream(s).
     */
    views?: View[];
    /**
     * Configure the exemplar filter.
     * Values include: trace_based, always_on, always_off.
     * If omitted or null, trace_based is used.
     */
    exemplar_filter?: ExemplarFilter;
}
export declare enum ExemplarFilter {
    AlwaysOff = "always_off",
    AlwaysOn = "always_on",
    TraceBased = "trace_based"
}
export interface PeriodicMetricReader {
    /**
     * Configure delay interval (in milliseconds) between start of two consecutive exports.
     * Value must be non-negative.
     * If omitted or null, 60000 is used.
     */
    interval?: number;
    /**
     * Configure maximum allowed time (in milliseconds) to export data.
     * Value must be non-negative. A value of 0 indicates no limit (infinity).
     * If omitted or null, 30000 is used.
     */
    timeout?: number;
    /**
     * Configure exporter.
     */
    exporter: PushMetricExporter;
    /**
     * Configure metric producers.
     */
    producers?: MetricProducer[];
    /**
     * Configure cardinality limits.
     */
    cardinality_limits?: CardinalityLimits;
}
export interface PullMetricReader {
    /**
     * Configure exporter.
     */
    exporter: PullMetricExporter;
    /**
     * Configure metric producers.
     */
    producers?: MetricProducer[];
    /**
     * Configure cardinality limits.
     */
    cardinality_limits?: CardinalityLimits;
}
export interface CardinalityLimits {
    /**
     * Configure default cardinality limit for all instrument types.
     * Instrument-specific cardinality limits take priority.
     * If omitted or null, 2000 is used.
     */
    default?: number;
    /**
     * Configure default cardinality limit for counter instruments.
     * If omitted or null, the value from .default is used.
     */
    counter?: number;
    /**
     * Configure default cardinality limit for gauge instruments.
     * If omitted or null, the value from .default is used.
     */
    gauge?: number;
    /**
     * Configure default cardinality limit for histogram instruments.
     * If omitted or null, the value from .default is used.
     */
    histogram?: number;
    /**
     * Configure default cardinality limit for observable_counter instruments.
     * If omitted or null, the value from .default is used.
     */
    observable_counter?: number;
    /**
     * Configure default cardinality limit for observable_gauge instruments.
     * If omitted or null, the value from .default is used.
     */
    observable_gauge?: number;
    /**
     * Configure default cardinality limit for observable_up_down_counter instruments.
     * If omitted or null, the value from .default is used.
     */
    observable_up_down_counter?: number;
    /**
     * Configure default cardinality limit for up_down_counter instruments.
     * If omitted or null, the value from .default is used.
     */
    up_down_counter?: number;
}
export interface PushMetricExporter {
    /**
     * Configure exporter to be OTLP with HTTP transport.
     */
    otlp_http?: OtlpHttpMetricExporter;
    /**
     * Configure exporter to be OTLP with gRPC transport.
     */
    otlp_grpc?: OtlpGrpcMetricExporter;
    /**
     * Configure exporter to be OTLP with file transport.
     * This type is in development and subject to breaking changes in minor versions.
     */
    'otlp_file/development'?: ExperimentalOtlpFileMetricExporter;
    /**
     * Configure exporter to be console.
     */
    console?: ConsoleMetricExporter;
}
export interface PullMetricExporter {
    /**
     * Configure exporter to be prometheus.
     * This type is in development and subject to breaking changes in minor versions.
     */
    'prometheus/development': ExperimentalPrometheusMetricExporter;
}
export interface MetricProducer {
    /**
     * Configure metric producer to be opencensus.
     */
    opencensus?: object;
}
export interface ExperimentalPrometheusMetricExporter {
    /**
     * Configure host.
     * If omitted or null, localhost is used.
     */
    host?: string;
    /**
     * Configure port.
     * If omitted or null, 9464 is used.
     */
    port?: number;
    /**
     * Configure Prometheus Exporter to produce metrics without a scope info metric.
     * If omitted or null, false is used.
     */
    without_scope_info?: boolean;
    /**
     * Configure Prometheus Exporter to produce metrics without a target info metric for the resource.
     * If omitted or null, false is used.
     */
    without_target_info?: boolean;
    /**
     * Configure Prometheus Exporter to add resource attributes as metrics attributes.
     */
    with_resource_constant_labels?: IncludeExclude;
    /**
     * Configure how metric names are translated to Prometheus metric names.
     */
    translation_strategy?: ExperimentalPrometheusTranslationStrategy;
}
export declare enum ExperimentalPrometheusTranslationStrategy {
    UnderscoreEscapingWithSuffixes = "underscore_escaping_with_suffixes",
    UnderscoreEscapingWithoutSuffixes = "underscore_escaping_without_suffixes",
    NoUtf8EscapingWithSuffixes = "no_utf8_escaping_with_suffixes",
    NoTranslation = "no_translation"
}
export interface MetricReader {
    /**
     * Configure a periodic metric reader.
     */
    periodic?: PeriodicMetricReader;
    /**
     * Configure a pull based metric reader.
     */
    pull?: PullMetricReader;
}
export interface OtlpHttpMetricExporter {
    /**
     * Configure endpoint, including the metric specific path.
     * If omitted or null, http://localhost:4318/v1/metrics is used.
     */
    endpoint?: string;
    /**
     * Configure TLS settings for the exporter.
     */
    tls?: HttpTls;
    /**
     * Configure headers. Entries have higher priority than entries from .headers_list.
     * If an entry's .value is null, the entry is ignored.
     */
    headers?: NameStringValuePair[];
    /**
     * Configure headers. Entries have lower priority than entries from .headers.
     * The value is a list of comma separated key-value pairs matching the format of OTEL_EXPORTER_OTLP_HEADERS.
     * If omitted or null, no headers are added.
     */
    headers_list?: string;
    /**
     * Configure compression.
     * Values include: gzip, none. Implementations may support other compression algorithms.
     * If omitted or null, none is used.
     */
    compression?: string;
    /**
     * Configure max time (in milliseconds) to wait for each export.
     * Value must be non-negative. A value of 0 indicates no limit (infinity).
     * If omitted or null, 10000 is used.
     */
    timeout?: number;
    /**
     * Configure the encoding used for messages.
     * Values include: protobuf, json. Implementations may not support json.
     * If omitted or null, protobuf is used.
     */
    encoding?: OtlpHttpEncoding;
    /**
     * Configure temporality preference.
     * Values include: cumulative, delta, low_memory.
     * If omitted or null, cumulative is used.
     */
    temporality_preference?: ExporterTemporalityPreference;
    /**
     * Configure default histogram aggregation.
     * Values include: explicit_bucket_histogram, base2_exponential_bucket_histogram.
     * If omitted or null, explicit_bucket_histogram is used.
     */
    default_histogram_aggregation?: ExporterDefaultHistogramAggregation;
}
export interface OtlpGrpcMetricExporter {
    /**
     * Configure endpoint.
     * If omitted or null, http://localhost:4317 is used.
     */
    endpoint?: string;
    /**
     * Configure TLS settings for the exporter.
     */
    tls?: GrpcTls;
    /**
     * Configure headers. Entries have higher priority than entries from .headers_list.
     * If an entry's .value is null, the entry is ignored.
     */
    headers?: NameStringValuePair[];
    /**
     * Configure headers. Entries have lower priority than entries from .headers.
     * The value is a list of comma separated key-value pairs matching the format of OTEL_EXPORTER_OTLP_HEADERS.
     * If omitted or null, no headers are added.
     */
    headers_list?: string;
    /**
     * Configure compression.
     * Values include: gzip, none. Implementations may support other compression algorithms.
     * If omitted or null, none is used.
     */
    compression?: string;
    /**
     * Configure max time (in milliseconds) to wait for each export.
     * Value must be non-negative. A value of 0 indicates no limit (infinity).
     * If omitted or null, 10000 is used.
     */
    timeout?: number;
    /**
     * Configure temporality preference.
     * Values include: cumulative, delta, low_memory.
     * If omitted or null, cumulative is used.
     */
    temporality_preference?: ExporterTemporalityPreference;
    /**
     * Configure default histogram aggregation.
     * Values include: explicit_bucket_histogram, base2_exponential_bucket_histogram.
     * If omitted or null, explicit_bucket_histogram is used.
     */
    default_histogram_aggregation?: ExporterDefaultHistogramAggregation;
}
export interface ExperimentalOtlpFileMetricExporter {
    /**
     * Configure output stream.
     * Values include stdout, or scheme+destination. For example: file:///path/to/file.jsonl.
     * If omitted or null, stdout is used.
     */
    output_stream?: string;
    /**
     * Configure temporality preference.
     * Values include: cumulative, delta, low_memory.
     * If omitted or null, cumulative is used.
     */
    temporality_preference?: ExporterTemporalityPreference;
    /**
     * Configure default histogram aggregation.
     * Values include: explicit_bucket_histogram, base2_exponential_bucket_histogram.
     * If omitted or null, explicit_bucket_histogram is used.
     */
    default_histogram_aggregation?: ExporterDefaultHistogramAggregation;
}
export declare enum ExporterTemporalityPreference {
    Cumulative = "cumulative",
    Delta = "delta",
    LowMemory = "low_memory"
}
export declare enum ExporterDefaultHistogramAggregation {
    Base2ExponentialBucketHistogram = "base2_exponential_bucket_histogram",
    ExplicitBucketHistogram = "explicit_bucket_histogram"
}
export interface ConsoleMetricExporter {
    /**
     * Configure temporality preference.
     * If omitted or null, cumulative is used.
     */
    temporality_preference?: ExporterTemporalityPreference;
    /**
     * Configure default histogram aggregation.
     * If omitted or null, explicit_bucket_histogram is used.
     */
    default_histogram_aggregation?: ExporterDefaultHistogramAggregation;
}
export interface View {
    /**
     * Configure view selector.
     */
    selector?: ViewSelector;
    /**
     * Configure view stream.
     */
    stream?: ViewStream;
}
export interface ViewSelector {
    /**
     * Configure instrument name selection criteria.
     * If omitted or null, all instrument names match.
     */
    instrument_name?: string;
    /**
     * Configure instrument type selection criteria.
     * Values include: counter, gauge, histogram, observable_counter, observable_gauge,
     * observable_up_down_counter, up_down_counter.
     * If omitted or null, all instrument types match.
     */
    instrument_type?: InstrumentType;
    /**
     * Configure the instrument unit selection criteria.
     * If omitted or null, all instrument units match.
     */
    unit?: string;
    /**
     * Configure meter name selection criteria.
     * If omitted or null, all meter names match.
     */
    meter_name?: string;
    /**
     * Configure meter version selection criteria.
     * If omitted or null, all meter versions match.
     */
    meter_version?: string;
    /**
     * Configure meter schema url selection criteria.
     * If omitted or null, all meter schema URLs match.
     */
    meter_schema_url?: string;
}
export declare enum InstrumentType {
    Counter = "counter",
    Gauge = "gauge",
    Histogram = "histogram",
    ObservableCounter = "observable_counter",
    ObservableGauge = "observable_gauge",
    ObservableUpDownCounter = "observable_up_down_counter",
    UpDownCounter = "up_down_counter"
}
export interface ViewStream {
    /**
     * Configure metric name of the resulting stream(s).
     * If omitted or null, the instrument's original name is used.
     */
    name?: string;
    /**
     * Configure metric description of the resulting stream(s).
     * If omitted or null, the instrument's origin description is used.
     */
    description?: string;
    /**
     * Configure aggregation of the resulting stream(s).
     * Values include: default, drop, explicit_bucket_histogram, base2_exponential_bucket_histogram, last_value, sum.
     * If omitted, default is used.
     */
    aggregation?: Aggregation;
    /**
     * Configure the aggregation cardinality limit.
     * If omitted or null, the metric reader's default cardinality limit is used.
     */
    aggregation_cardinality_limit?: number;
    /**
     * Configure attribute keys retained in the resulting stream(s).
     */
    attribute_keys?: IncludeExclude;
}
export interface Aggregation {
    /**
     * Configure aggregation to be default.
     */
    default?: object;
    /**
     * Configure aggregation to be drop.
     */
    drop?: object;
    /**
     * Configure aggregation to be explicit_bucket_histogram.
     */
    explicit_bucket_histogram?: ExplicitBucketHistogramAggregation;
    /**
     * Configure aggregation to be base2_exponential_bucket_histogram.
     */
    base2_exponential_bucket_histogram?: Base2ExponentialBucketHistogramAggregation;
    /**
     * Configure aggregation to be last_value.
     */
    last_value?: object;
    /**
     * Configure aggregation to be sum.
     */
    sum?: object;
}
export interface ExplicitBucketHistogramAggregation {
    /**
     * Configure bucket boundaries.
     * If omitted, [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000] is used.
     */
    boundaries?: number[];
    /**
     * Configure record min and max.
     * If omitted or null, true is used.
     */
    record_min_max?: boolean;
}
export interface Base2ExponentialBucketHistogramAggregation {
    /**
     * Configure max_scale.
     */
    max_scale?: number;
    /**
     * Configure max_size.
     */
    max_size?: number;
    /**
     * Configure record min and max.
     * If omitted or null, true is used.
     */
    record_min_max?: boolean;
}
//# sourceMappingURL=meterProviderModel.d.ts.map