import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	Attributes,
	Context,
	Link,
	SpanKind,
	TextMapGetter,
	TextMapPropagator,
	TextMapSetter,
} from '@opentelemetry/api';
import { CompositePropagator } from '@opentelemetry/core';
import {
	AlwaysOffSampler,
	type ReadableSpan,
	type Sampler,
	type SamplingResult,
	type Span,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';

export type TracingPipeline = {
	spanProcessors: SpanProcessor[];
	sampler: Sampler;
	propagator: TextMapPropagator;
};

export type ShutdownErrors = unknown[];

export const TRACING_OFF: TracingPipeline = {
	spanProcessors: [],
	sampler: new AlwaysOffSampler(),
	propagator: new CompositePropagator(),
};

export class SwappableSpanProcessor implements SpanProcessor {
	private processors = TRACING_OFF.spanProcessors;

	async replace(next: SpanProcessor[]): Promise<ShutdownErrors> {
		const previous = this.processors;
		this.processors = next;
		const results = await Promise.allSettled(
			previous.map(async (processor) => await processor.shutdown()),
		);

		return results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
	}

	onStart(span: Span, parentContext: Context): void {
		for (const processor of this.processors) processor.onStart(span, parentContext);
	}

	onEnd(span: ReadableSpan): void {
		for (const processor of this.processors) processor.onEnd(span);
	}

	async forceFlush(): Promise<void> {
		await Promise.all(this.processors.map(async (processor) => await processor.forceFlush()));
	}

	async shutdown(): Promise<void> {
		const [error] = await this.replace([]);
		if (error) throw ensureError(error);
	}
}

export class SwappableSampler implements Sampler {
	private sampler = TRACING_OFF.sampler;

	replace(next: Sampler): void {
		this.sampler = next;
	}

	shouldSample(
		context: Context,
		traceId: string,
		spanName: string,
		spanKind: SpanKind,
		attributes: Attributes,
		links: Link[],
	): SamplingResult {
		return this.sampler.shouldSample(context, traceId, spanName, spanKind, attributes, links);
	}

	toString(): string {
		return `SwappableSampler{${this.sampler.toString()}}`;
	}
}

export class SwappablePropagator implements TextMapPropagator {
	private propagator = TRACING_OFF.propagator;

	replace(next: TextMapPropagator): void {
		this.propagator = next;
	}

	inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
		this.propagator.inject(context, carrier, setter);
	}

	extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
		return this.propagator.extract(context, carrier, getter);
	}

	fields(): string[] {
		return this.propagator.fields();
	}
}
