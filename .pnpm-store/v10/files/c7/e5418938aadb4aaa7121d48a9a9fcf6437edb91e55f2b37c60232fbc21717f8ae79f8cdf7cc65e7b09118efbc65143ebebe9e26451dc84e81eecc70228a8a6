import type { Link, Attributes, SpanKind, Context } from "@opentelemetry/api";
import type { Sampler, SamplingResult } from "@opentelemetry/sdk-trace-base";
/**
 * ApplicationInsightsSampler is responsible for the following:
 * Implements same trace id hashing algorithm so that traces are sampled the same across multiple nodes
 * Adds item count to span attribute if span is sampled (needed for ingestion service)
 * @param samplingRatio - 0 to 1 value.
 */
export declare class ApplicationInsightsSampler implements Sampler {
    private readonly _sampleRate;
    private readonly samplingRatio;
    /**
     * Initializes a new instance of the ApplicationInsightsSampler class.
     * @param samplingRatio - Value in the range [0,1], 1 meaning all data will sampled and 0 all Tracing data will be sampled out.
     */
    constructor(samplingRatio?: number);
    /**
     * Checks whether span needs to be created and tracked.
     *
     * @param context - Parent Context which may contain a span.
     * @param traceId - traceif of the span to be created. It can be different from the
     *     traceId in the {@link SpanContext}. Typically in situations when the
     *     span to be created starts a new trace.
     * @param spanName - Name of the span to be created.
     * @param spanKind - Kind of the span to be created.
     * @param attributes - Initial set of SpanAttributes for the Span being constructed.
     * @param links - Collection of links that will be associated with the Span to
     *     be created. Typically useful for batch operations.
     * @returns a {@link SamplingResult}.
     */
    shouldSample(context: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes, links: Link[]): SamplingResult;
    /**
     * Return Sampler description
     */
    toString(): string;
    private _getSamplingHashCode;
}
//# sourceMappingURL=sampling.d.ts.map