import type { StartSpanOptions } from '@sentry/core';
import type Sentry from '@sentry/node';

import type { TracingInterface } from './tracing';

/**
 * Tracing implementation that uses Sentry to trace spans
 */
export class SentryTracing implements TracingInterface {
	constructor(private readonly sentry: typeof Sentry) {}

	async startSpan<T>(
		options: StartSpanOptions,
		spanCb: (span: Sentry.Span) => Promise<T>,
	): Promise<T> {
		return await this.sentry.startSpan(options, async (span) => {
			return await spanCb(span);
		});
	}
}
