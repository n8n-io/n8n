import { RewriteFrames } from '@sentry/integrations';
import { init, setTag, captureException, close } from '@sentry/node';
import * as a from 'assert/strict';
import { createHash } from 'crypto';
import { ApplicationError } from 'n8n-workflow';

import type { SentryConfig } from '@/config/sentry-config';

/**
 * Handles error reporting using Sentry
 */
export class ErrorReporting {
	private isInitialized = false;

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

		process.on('uncaughtException', (error) => {
			captureException(error);
		});

		const enabledIntegrations = [
			'InboundFilters',
			'FunctionToString',
			'LinkedErrors',
			'OnUnhandledRejection',
			'ContextLines',
		];
		const seenErrors = new Set<string>();

		init({
			dsn: this.dsn,
			release: this.sentryConfig.n8nVersion,
			environment: this.sentryConfig.environment,
			enableTracing: false,
			serverName: this.sentryConfig.deploymentName,
			beforeBreadcrumb: () => null,
			integrations: (integrations) => [
				...integrations.filter(({ name }) => enabledIntegrations.includes(name)),
				new RewriteFrames({ root: process.cwd() }),
			],
			async beforeSend(event, { originalException }) {
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
					if (seenErrors.has(eventHash)) return null;
					seenErrors.add(eventHash);
				}

				return event;
			},
		});

		setTag('server_type', 'task_runner');

		this.isInitialized = true;
	}

	async stop() {
		if (!this.isInitialized) {
			return;
		}

		await close(1000);
	}
}
