import type { StartSpanOptions } from '@sentry/core';
import type Sentry from '@sentry/node';

import type { TracingInterface } from './tracing';

/**
 * Tracing implementation that does not trace anything
 */
export class NoopTracing implements TracingInterface {
	async startSpan<T>(
		_options: StartSpanOptions,
		spanCb: (span?: Sentry.Span) => Promise<T>,
	): Promise<T> {
		return await spanCb(undefined);
	}
}
