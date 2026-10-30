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
import {
	CompositePropagator,
	getStringListFromEnv,
	W3CBaggagePropagator,
	W3CTraceContextPropagator,
} from '@opentelemetry/core';
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

const PROPAGATORS_BY_NAME: Record<string, () => TextMapPropagator> = {
	tracecontext: () => new W3CTraceContextPropagator(),
	baggage: () => new W3CBaggagePropagator(),
};

export const PROPAGATORS_ENV_VAR = 'OTEL_PROPAGATORS';

export const DEFAULT_PROPAGATOR_NAMES = ['tracecontext', 'baggage'];

// The names n8n does not carry. The spec asks for a warning for each one.
export function unknownPropagatorNames(names: string[]): string[] {
	return names.filter((name) => !(name.toLowerCase() in PROPAGATORS_BY_NAME));
}

// A name n8n does not carry is left out, so `none` and a name from another vendor both give a
// propagator that writes nothing. A repeated name registers its propagator once, as the spec
// asks, and the match ignores case.
export function propagatorFor(names: string[]): TextMapPropagator {
	const seen = new Set<string>();
	const propagators: TextMapPropagator[] = [];

	for (const name of names) {
		const key = name.toLowerCase();
		const make = PROPAGATORS_BY_NAME[key];
		if (!make || seen.has(key)) continue;

		seen.add(key);
		propagators.push(make());
	}

	return new CompositePropagator({ propagators });
}

// The names in `OTEL_PROPAGATORS`, or undefined when the variable is not set.
export function propagatorNamesFromEnv(): string[] | undefined {
	return getStringListFromEnv(PROPAGATORS_ENV_VAR);
}

// Set, the variable names the outbound headers. The switch still decides whether n8n sends
// any, so this only narrows the set.
export function propagatorFromEnv(): TextMapPropagator | undefined {
	const names = propagatorNamesFromEnv();
	return names && propagatorFor(names);
}

// What n8n sends when `OTEL_PROPAGATORS` is not set, the same default the spec gives.
export const DEFAULT_OUTBOUND_PROPAGATOR = propagatorFor(DEFAULT_PROPAGATOR_NAMES);

export class SwappableSpanProcessor implements SpanProcessor {
	private processors = TRACING_OFF.spanProcessors;

	private readonly pendingShutdowns = new Set<Promise<ShutdownErrors>>();

	async replace(next: SpanProcessor[]): Promise<ShutdownErrors> {
		const leaving = this.processors.filter((processor) => !next.includes(processor));
		this.processors = next;
		const shutdown = shutDownAll(leaving);
		this.pendingShutdowns.add(shutdown);
		void shutdown.finally(() => this.pendingShutdowns.delete(shutdown));

		return await shutdown;
	}

	onStart(span: Span, parentContext: Context): void {
		for (const processor of this.processors) processor.onStart(span, parentContext);
	}

	onEnd(span: ReadableSpan): void {
		for (const processor of this.processors) processor.onEnd(span);
	}

	async forceFlush(): Promise<void> {
		await Promise.all([
			...this.processors.map(async (processor) => await processor.forceFlush()),
			...this.pendingShutdowns,
		]);
	}

	async shutdown(): Promise<void> {
		const [error] = await this.replace([]);
		await Promise.all(this.pendingShutdowns);
		if (error) throw ensureError(error);
	}
}

async function shutDownAll(processors: SpanProcessor[]): Promise<ShutdownErrors> {
	const results = await Promise.allSettled(
		processors.map(async (processor) => await processor.shutdown()),
	);

	return results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
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
