"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationInsightsSampler = void 0;
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const applicationinsights_js_1 = require("./utils/constants/applicationinsights.js");
/**
 * ApplicationInsightsSampler is responsible for the following:
 * Implements same trace id hashing algorithm so that traces are sampled the same across multiple nodes
 * Adds item count to span attribute if span is sampled (needed for ingestion service)
 * @param samplingRatio - 0 to 1 value.
 */
class ApplicationInsightsSampler {
    /**
     * Initializes a new instance of the ApplicationInsightsSampler class.
     * @param samplingRatio - Value in the range [0,1], 1 meaning all data will sampled and 0 all Tracing data will be sampled out.
     */
    constructor(samplingRatio = 1) {
        this.samplingRatio = samplingRatio;
        if (this.samplingRatio > 1 || this.samplingRatio < 0 || !Number.isFinite(this.samplingRatio)) {
            throw new Error("Wrong sampling rate, data will not be sampled out");
        }
        this._sampleRate = Math.round(this.samplingRatio * 100);
    }
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
    shouldSample(
    // @ts-expect-error unused argument
    context, traceId, 
    // @ts-expect-error unused argument
    spanName, 
    // @ts-expect-error unused argument
    spanKind, attributes, 
    // @ts-expect-error unused argument
    links) {
        let isSampledIn = false;
        if (this._sampleRate === 100) {
            isSampledIn = true;
        }
        else if (this._sampleRate === 0) {
            isSampledIn = false;
        }
        else {
            isSampledIn = this._getSamplingHashCode(traceId) < this._sampleRate;
        }
        // Add sample rate as span attribute
        attributes = attributes || {};
        // Only send the sample rate if it's not 100
        if (this._sampleRate !== 100) {
            attributes[applicationinsights_js_1.AzureMonitorSampleRate] = this._sampleRate;
        }
        return isSampledIn
            ? { decision: sdk_trace_base_1.SamplingDecision.RECORD_AND_SAMPLED, attributes: attributes }
            : { decision: sdk_trace_base_1.SamplingDecision.NOT_RECORD, attributes: attributes };
    }
    /**
     * Return Sampler description
     */
    toString() {
        return `ApplicationInsightsSampler{${this.samplingRatio}}`;
    }
    _getSamplingHashCode(input) {
        const csharpMin = -2147483648;
        const csharpMax = 2147483647;
        let hash = 5381;
        if (!input) {
            return 0;
        }
        while (input.length < 8) {
            input = input + input;
        }
        for (let i = 0; i < input.length; i++) {
            // JS doesn't respond to integer overflow by wrapping around. Simulate it with bitwise operators ( | 0)
            hash = ((((hash << 5) + hash) | 0) + input.charCodeAt(i)) | 0;
        }
        hash = hash <= csharpMin ? csharpMax : Math.abs(hash);
        return (hash / csharpMax) * 100;
    }
}
exports.ApplicationInsightsSampler = ApplicationInsightsSampler;
//# sourceMappingURL=sampling.js.map