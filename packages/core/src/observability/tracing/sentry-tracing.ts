import type Sentry from '@sentry/node';

import type { Span, StartSpanOpts, Tracer } from './tracing';

/**
 * Tracing implementation that uses Sentry to trace spans
 */
export class SentryTracing implements Tracer {
	constructor(private readonly sentry: Pick<typeof Sentry, 'startSpan'>) {}

	async startSpan<T>(options: StartSpanOpts, spanCb: (span: Span) => Promise<T>): Promise<T> {
		return await this.sentry.startSpan(options, async (span) => {
			return await spanCb(span);
		});
	}
}
