import { ensureError } from '@n8n/utils/errors/ensure-error';
import type Sentry from '@sentry/node';

import { SpanStatus, type Span, type StartSpanOpts, type Tracer } from './tracing';

/**
 * Tracing implementation that uses Sentry to trace spans
 */
export class SentryTracing implements Tracer {
	constructor(private readonly sentry: Pick<typeof Sentry, 'startSpan' | 'startNewTrace'>) {}

	async startSpan<T>(options: StartSpanOpts, spanCb: (span: Span) => Promise<T>): Promise<T> {
		return await this.sentry.startSpan(options, async (span) => {
			try {
				return await spanCb(span);
			} catch (e) {
				const error = ensureError(e);
				span.setStatus({ code: SpanStatus.error, message: error.message });
				span.setAttributes({
					'error.type': error.constructor.name,
					'error.message': error.message,
				});
				throw e;
			}
		});
	}

	async startNewTraceSpan<T>(
		options: StartSpanOpts,
		spanCb: (span: Span) => Promise<T>,
	): Promise<T> {
		return await this.sentry.startNewTrace(async () => await this.startSpan(options, spanCb));
	}
}
