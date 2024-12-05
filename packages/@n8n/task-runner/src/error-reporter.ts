import {
	init,
	setTag,
	captureException,
	close,
	rewriteFramesIntegration,
	type EventHint,
	type ErrorEvent,
} from '@sentry/node';
import * as a from 'assert/strict';
import { createHash } from 'crypto';
import { ApplicationError } from 'n8n-workflow';

import type { SentryConfig } from '@/config/sentry-config';

/**
 * Handles error reporting using Sentry
 */
export class ErrorReporter {
	private isInitialized = false;

	/** Hashes of error stack traces, to deduplicate error reports. */
	private readonly seenErrors = new Set<string>();

	private get dsn() {
		return this.sentryConfig.sentryDsn;
	}

	constructor(private readonly sentryConfig: SentryConfig) {
		a.ok(this.dsn, 'Sentry DSN is required to initialize Sentry');
	}

	async start() {
		if (this.isInitialized) return;

		// Collect longer stacktraces
		Error.stackTraceLimit = 50;

		process.on('uncaughtException', captureException);

		const ENABLED_INTEGRATIONS = [
			'InboundFilters',
			'FunctionToString',
			'LinkedErrors',
			'OnUnhandledRejection',
			'ContextLines',
		];

		setTag('server_type', 'task_runner');

		init({
			dsn: this.dsn,
			release: this.sentryConfig.n8nVersion,
			environment: this.sentryConfig.environment,
			enableTracing: false,
			serverName: this.sentryConfig.deploymentName,
			beforeBreadcrumb: () => null,
			beforeSend: async (event, hint) => await this.beforeSend(event, hint),
			integrations: (integrations) => [
				...integrations.filter(({ name }) => ENABLED_INTEGRATIONS.includes(name)),
				rewriteFramesIntegration({ root: process.cwd() }),
			],
		});

		this.isInitialized = true;
	}

	async stop() {
		if (!this.isInitialized) {
			return;
		}

		await close(1000);
	}

	async beforeSend(event: ErrorEvent, { originalException }: EventHint) {
		if (!originalException) return null;

		if (originalException instanceof Promise) {
			originalException = await originalException.catch((error) => error as Error);
		}

		if (originalException instanceof ApplicationError) {
			const { level, extra, tags } = originalException;
			if (level === 'warning') return null;
			event.level = level;
			if (extra) event.extra = { ...event.extra, ...extra };
			if (tags) event.tags = { ...event.tags, ...tags };
		}

		if (originalException instanceof Error && originalException.stack) {
			const eventHash = createHash('sha1').update(originalException.stack).digest('base64');
			if (this.seenErrors.has(eventHash)) return null;
			this.seenErrors.add(eventHash);
		}

		return event;
	}
}
