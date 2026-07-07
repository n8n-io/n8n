/**
 * Minimal tracing port. The scheduler stays dependency-light: it depends on this
 * interface, and the host adapts its concrete (Sentry-backed) tracer to it. The
 * status codes match Sentry's span status codes so the host adapter is a
 * pass-through.
 */
export const SpanStatus = { ok: 1, error: 2 } as const;

export interface SpanOptions {
	name: string;
	op?: string;
	attributes?: Record<string, string | number | boolean | undefined>;
}

export interface Span {
	setAttribute(key: string, value: string | number | boolean): void;
	setStatus(status: { code: number; message?: string }): void;
}

export interface Tracer {
	/**
	 * Run `run` inside a span. A throw from `run` marks the span errored (the
	 * concrete tracer does that) and propagates.
	 */
	startSpan<T>(options: SpanOptions, run: (span: Span) => Promise<T>): Promise<T>;
}

/** Default tracer: runs the work, records nothing. */
export const noopTracer: Tracer = {
	async startSpan(_options, run) {
		return await run({ setAttribute() {}, setStatus() {} });
	},
};
