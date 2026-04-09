import { ExperimentalOtlpFileExporter, OtlpGrpcExporter, OtlpHttpExporter } from './commonModel';
export declare function initializeDefaultTracerProviderConfiguration(): Required<TracerProvider>;
export interface TracerProvider {
    /**
     * Configure span processors.
     */
    processors: SpanProcessor[];
    /**
     * Configure span limits. See also attribute_limits.
     */
    limits?: SpanLimits;
    /**
     * Configure the sampler.
     * If omitted, parent based sampler with a root of always_on is used.
     */
    sampler?: Sampler;
}
export interface BatchSpanProcessor {
    /**
     * Configure delay interval (in milliseconds) between two consecutive exports.
     * Value must be non-negative.
     * If omitted or null, 5000 is used for traces and 1000 for logs.
     */
    schedule_delay?: number;
    /**
     * Configure maximum allowed time (in milliseconds) to export data.
     * Value must be non-negative. A value of 0 indicates no limit (infinity).
     * If omitted or null, 30000 is used.
     */
    export_timeout?: number;
    /**
     * Configure maximum queue size. Value must be positive.
     * If omitted or null, 2048 is used.
     */
    max_queue_size?: number;
    /**
     * Configure maximum batch size. Value must be positive.
     * If omitted or null, 512 is used.
     */
    max_export_batch_size?: number;
    /**
     * Configure exporter.
     */
    exporter: SpanExporter;
}
export interface Sampler {
    /**
     * Configure sampler to be parent_based.
     */
    parent_based?: ParentBasedSampler;
    /**
     * Configure sampler to be always_off.
     */
    always_off?: object;
    /**
     * Configure sampler to be always_on.
     */
    always_on?: object;
    /***
     * Configure sampler to be trace_id_ratio_based.
     */
    trace_id_ratio_based?: TraceIdRatioBasedSampler;
}
export interface ParentBasedSampler {
    /**
     * Configure root sampler.
     * If omitted or null, always_on is used.
     */
    root?: Sampler;
    /**
     * Configure remote_parent_sampled sampler.
     * If omitted or null, always_on is used.
     */
    remote_parent_sampled?: Sampler;
    /**
     * Configure remote_parent_not_sampled sampler.
     * If omitted or null, always_off is used.
     */
    remote_parent_not_sampled?: Sampler;
    /**
     * Configure local_parent_sampled sampler.
     * If omitted or null, always_on is used.
     */
    local_parent_sampled?: Sampler;
    /**
     * Configure local_parent_not_sampled sampler.
     * If omitted or null, always_off is used.
     */
    local_parent_not_sampled?: Sampler;
}
export interface TraceIdRatioBasedSampler {
    /**
     * Configure trace_id_ratio.
     */
    ratio?: number;
}
export interface SimpleSpanProcessor {
    /**
     * Configure exporter.
     */
    exporter: SpanExporter;
}
export interface SpanExporter {
    /**
     * Configure exporter to be OTLP with HTTP transport.
     */
    otlp_http?: OtlpHttpExporter;
    /**
     * Configure exporter to be OTLP with gRPC transport.
     */
    otlp_grpc?: OtlpGrpcExporter;
    /**
     * Configure exporter to be OTLP with file transport.
     * This type is in development and subject to breaking changes in minor versions.
     */
    'otlp_file/development'?: ExperimentalOtlpFileExporter;
    /**
     * Configure exporter to be console.
     */
    console?: object;
}
export interface SpanLimits {
    /**
     * Configure max attribute value size. Overrides .attribute_limits.attribute_value_length_limit.
     * Value must be non-negative.
     * If omitted or null, there is no limit.
     */
    attribute_value_length_limit?: number;
    /**
     * Configure max attribute count. Overrides .attribute_limits.attribute_count_limit.
     * Value must be non-negative.
     * If omitted or null, 128 is used.
     */
    attribute_count_limit?: number;
    /**
     * Configure max span event count.
     * Value must be non-negative.
     * If omitted or null, 128 is used.
     */
    event_count_limit?: number;
    /**
     * Configure max span link count.
     * Value must be non-negative.
     * If omitted or null, 128 is used.
     */
    link_count_limit?: number;
    /**
     * Configure max attributes per span event.
     * Value must be non-negative.
     * If omitted or null, 128 is used.
     */
    event_attribute_count_limit?: number;
    /**
     * Configure max attributes per span link.
     * Value must be non-negative.
     * If omitted or null, 128 is used.
     */
    link_attribute_count_limit?: number;
}
export interface SpanProcessor {
    /**
     * Configure a batch span processor.
     */
    batch?: BatchSpanProcessor;
    /**
     * Configure a simple span processor.
     */
    simple?: SimpleSpanProcessor;
}
//# sourceMappingURL=tracerProviderModel.d.ts.map