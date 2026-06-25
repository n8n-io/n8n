import type Sentry from '@sentry/node';
import { ensureError } from 'n8n-workflow';

import { SpanStatus, type Span, type StartSpanOpts, type Tracer } from './tracing';

/**
 * Tracing implementation that uses Sentry to trace spans
 */
export class SentryTracing implements Tracer {
	constructor(private readonly sentry: Pick<typeof Sentry, 'startSpan'>) {}

	async startSpan<T>(options: StartSpanOpts, spanCb: (span: Span) => Promise<T>): Promise<T> {
		return await this.sentry.startSpan(options, async (span) => {
			try {
				return await spanCb(span);
			} catch (e) {
				// Attach the exception to the span so failures are diagnosable in Sentry,
				// then rethrow to preserve the caller's control flow.
				const error = ensureError(e);
				span.recordException(error);
				span.setStatus({ code: SpanStatus.error, message: error.message });
				span.setAttributes({
					'error.type': error.constructor.name,
					'error.message': error.message,
				});
				throw e;
			}
		});
	}
}
