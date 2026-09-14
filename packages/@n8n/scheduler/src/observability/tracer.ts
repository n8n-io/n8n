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
	/**
	 * Start a fresh trace instead of parenting under whatever span is active on
	 * the calling async context. Needed when `run` executes on a timer/callback
	 * scheduled from inside another span (e.g. a fire span armed from within the
	 * claim span's tick): without this, the async context still carries the
	 * claim span into the timer callback, so the fire span is parented under a
	 * root that may already have finished and been sent — Sentry drops children
	 * that close after their root is sent.
	 */
	newTrace?: boolean;
}

export interface Span {
	setAttribute(key: string, value: string | number | boolean): void;
	setStatus(status: { code: number; message?: string }): void;
}

export interface Tracer {
	/**
	 * Run `run` inside a span. A throw from `run` marks the span errored (the
	 * concrete tracer does that) and propagates.
	 *
	 * The tracer's own machinery is trusted not to throw before invoking `run`
	 * (same trust model as the scheduler's loop hooks): every pass, fire and
	 * handler run goes through this uncaught, so a throwing host tracer would
	 * take the scheduler down with it.
	 */
	startSpan<T>(options: SpanOptions, run: (span: Span) => Promise<T>): Promise<T>;
}

/** Default tracer: runs the work, records nothing. */
export const noopTracer: Tracer = {
	async startSpan(_options, run) {
		return await run({ setAttribute() {}, setStatus() {} });
	},
};
