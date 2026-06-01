import type { Span, StartSpanOpts, Tracer, SpanContextData } from './tracing';

/** Empty span implementation that does not trace anything */
export class EmptySpan implements Span {
	private readonly emptyContextData: SpanContextData = Object.freeze({
		traceId: '00000000000000000000000000000000',
		spanId: '0000000000000000',
		traceFlags: 0,
	});

	spanContext(): SpanContextData {
		return this.emptyContextData;
	}

	end(): void {
		// noop
	}

	setAttribute(): this {
		return this;
	}

	setAttributes(): this {
		return this;
	}

	setStatus(): this {
		return this;
	}

	updateName(): this {
		return this;
	}

	isRecording(): boolean {
		return false;
	}

	addEvent(): this {
		return this;
	}

	addLink(): this {
		return this;
	}

	addLinks(): this {
		return this;
	}

	recordException(): void {
		// noop
	}
}

/**
 * Tracing implementation that does not trace anything
 */
export class NoopTracing implements Tracer {
	private readonly emptySpan = new EmptySpan();

	async startSpan<T>(_options: StartSpanOpts, spanCb: (span: Span) => Promise<T>): Promise<T> {
		return await spanCb(this.emptySpan);
	}
}
