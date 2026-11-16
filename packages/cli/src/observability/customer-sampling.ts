import { trace, type Attributes, type Context, type Link, type SpanKind } from '@opentelemetry/api';
import {
	SamplingDecision,
	type ReadableSpan,
	type Sampler,
	type SamplingResult,
	type Span,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';

type CustomerDecisions = WeakMap<object, boolean>;

/**
 * Applies the customer's sampler to spans of a provider that samples every span.
 * A child span follows its parent's decision, so a trace is kept or dropped as a whole.
 */
export class SampledSpanProcessor implements SpanProcessor {
	constructor(
		private readonly decisions: CustomerDecisions,
		private readonly sampler: Sampler,
		private readonly processor?: SpanProcessor,
	) {}

	onStart(span: Span, parentContext: Context): void {
		const sampled = this.processor !== undefined && this.isSampled(span, parentContext);
		this.decisions.set(span, sampled);
		if (sampled) this.processor?.onStart(span, parentContext);
	}

	onEnd(span: ReadableSpan): void {
		if (this.decisions.get(span)) this.processor?.onEnd(span);
	}

	async forceFlush(): Promise<void> {
		await this.processor?.forceFlush();
	}

	// The provider that owns the wrapped processor shuts it down.
	async shutdown(): Promise<void> {}

	private isSampled(span: Span, parentContext: Context): boolean {
		const parent = trace.getSpan(parentContext);
		const inherited = parent && this.decisions.get(parent);
		if (inherited !== undefined) return inherited;

		const { decision } = this.sampler.shouldSample(
			parentContext,
			span.spanContext().traceId,
			span.name,
			span.kind,
			span.attributes,
			span.links,
		);
		return decision === SamplingDecision.RECORD_AND_SAMPLED;
	}
}

/**
 * Drops the children of a span that `SampledSpanProcessor` kept away from the customer,
 * so they do not reach the customer without their parent.
 */
export class SampledParentSampler implements Sampler {
	constructor(
		private readonly decisions: CustomerDecisions,
		private readonly sampler: Sampler,
	) {}

	shouldSample(
		context: Context,
		traceId: string,
		spanName: string,
		spanKind: SpanKind,
		attributes: Attributes,
		links: Link[],
	): SamplingResult {
		const parent = trace.getSpan(context);
		if (parent && this.decisions.get(parent) === false) {
			return { decision: SamplingDecision.NOT_RECORD };
		}

		return this.sampler.shouldSample(context, traceId, spanName, spanKind, attributes, links);
	}

	toString(): string {
		return `SampledParentSampler{${this.sampler.toString()}}`;
	}
}
