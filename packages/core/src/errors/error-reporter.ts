import { inTest, Logger } from '@n8n/backend-common';
import { type InstanceType } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { ReportingOptions } from '@n8n/errors';
import type { ErrorEvent, EventHint } from '@sentry/core';
import type { NodeOptions } from '@sentry/node';
import { AxiosError } from 'axios';
import { ApplicationError, ExecutionCancelledError, BaseError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { Tracing, SentryTracing } from '@/observability';

type SentryIntegration = 'Redis' | 'Postgres' | 'Http' | 'Express';

type ErrorReporterInitOptions = {
	serverType: InstanceType | 'task_runner';
	dsn: string;
	release: string;
	environment: string;
	serverName: string;
	releaseDate?: Date;

	/** Whether to enable event loop block detection, if Sentry is enabled. */
	withEventLoopBlockDetection: boolean;

	/** Threshold in ms for event loop block detection. Only used if `withEventLoopBlockDetection` is true. */
	eventLoopBlockThreshold?: number;

	/** Sample rate for Sentry traces (0.0 to 1.0). 0 means disabled */
	tracesSampleRate: number;

	/** Sample rate for Sentry profiling (0.0 to 1.0). 0 means disabled */
	profilesSampleRate: number;

	/**
	 * Function to allow filtering out errors before they are sent to Sentry.
	 * Return true if the error should be filtered out.
	 */
	beforeSendFilter?: (event: ErrorEvent, hint: EventHint) => boolean;

	/**
	 * Integrations eligible for enablement. `tracesSampleRate` still determines
	 * whether they are actually enabled or not.
	 */
	eligibleIntegrations?: Partial<Record<SentryIntegration, boolean>>;

	/** Health endpoint path */
	healthEndpoint?: string;
};

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const SIX_WEEKS_IN_MS = 6 * 7 * ONE_DAY_IN_MS;
const RELEASE_EXPIRATION_WARNING =
	'Error tracking disabled because this release is older than 6 weeks.';

@Service()
export class ErrorReporter {
	private expirationTimer?: NodeJS.Timeout;

	/** Hashes of error stack traces, to deduplicate error reports. */
	private seenErrors = new Set<string>();

	private report: (error: Error | string, options?: ReportingOptions) => void;

	private beforeSendFilter?: (event: ErrorEvent, hint: EventHint) => boolean;

	constructor(
		private readonly logger: Logger,
		private readonly tracing: Tracing,
	) {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		this.report = this.defaultReport;
	}

	private defaultReport(error: Error | string, options?: ReportingOptions) {
		if (error instanceof Error) {
			let e = error;

			const { executionId } = options ?? {};
			const context = executionId ? ` (execution ${executionId})` : '';

			do {
				let stack = '';
				let meta = undefined;
				if (e instanceof ApplicationError || e instanceof BaseError) {
					if (e.level === 'error' && e.stack) {
						stack = `\n${e.stack}\n`;
					}
					meta = e.extra;
				}
				const msg = [e.message + context, stack].join('');
				// Default to logging the error if option is not specified
				if (options?.shouldBeLogged ?? true) {
					this.logger.error(msg, meta);
				}
				e = e.cause as Error;
			} while (e);
		}
	}

	async shutdown(timeoutInMs = 1000) {
		clearTimeout(this.expirationTimer);
		const { close } = await import('@sentry/node');
		await close(timeoutInMs);
	}

	async init({
		beforeSendFilter,
		dsn,
		serverType,
		release,
		environment,
		serverName,
		releaseDate,
		withEventLoopBlockDetection,
		eventLoopBlockThreshold,
		profilesSampleRate,
		tracesSampleRate,
		eligibleIntegrations = {},
		healthEndpoint = '/healthz',
	}: ErrorReporterInitOptions) {
		if (inTest) return;

		process.on('uncaughtException', (error) => {
			this.error(error);
		});

		if (releaseDate) {
			const releaseExpiresAtMs = releaseDate.getTime() + SIX_WEEKS_IN_MS;
			const releaseExpiresInMs = () => releaseExpiresAtMs - Date.now();
			if (releaseExpiresInMs() <= 0) {
				this.logger.warn(RELEASE_EXPIRATION_WARNING);
				return;
			}
			const checkForExpiration = () => {
				// Once this release expires, reject all events
				if (releaseExpiresInMs() <= 0) {
					this.logger.warn(RELEASE_EXPIRATION_WARNING);
					// eslint-disable-next-line @typescript-eslint/unbound-method
					this.report = this.defaultReport;
				} else {
					this.expirationTimer = setTimeout(checkForExpiration, ONE_DAY_IN_MS);
				}
			};
			checkForExpiration();
		}

		if (!dsn) return;

		// Collect longer stacktraces
		Error.stackTraceLimit = 50;

		const sentry = await import('@sentry/node');
		const {
			init,
			captureException,
			setTag,
			setUser,
			requestDataIntegration,
			rewriteFramesIntegration,
		} = sentry;

		// Most of the integrations are listed here:
		// https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/
		const enabledIntegrations = new Set([
			'InboundFilters',
			'FunctionToString',
			'LinkedErrors',
			'OnUnhandledRejection',
			'ContextLines',
		]);

		const isTracingEnabled = tracesSampleRate > 0;
		if (isTracingEnabled) {
			const tracingIntegrations: SentryIntegration[] = ['Http', 'Postgres', 'Redis', 'Express'];
			tracingIntegrations
				.filter((integrationName) => !!eligibleIntegrations[integrationName])
				.forEach((integrationName) => enabledIntegrations.add(integrationName));

			this.tracing.setTracingImplementation(new SentryTracing(sentry));
		}

		const isProfilingEnabled = profilesSampleRate > 0;
		if (isProfilingEnabled && !isTracingEnabled) {
			this.logger.warn('Profiling is enabled but tracing is disabled. Profiling will not work.');
		}

		const eventLoopBlockIntegration = withEventLoopBlockDetection
			? // The EventLoopBlockIntegration doesn't automatically include the
				// same tags, so we set them explicitly.
				await this.getEventLoopBlockIntegration(
					{
						server_name: serverName,
						server_type: serverType,
					},
					eventLoopBlockThreshold,
				)
			: [];

		const profilingIntegration = isProfilingEnabled ? await this.getProfilingIntegration() : [];

		init({
			dsn,
			release,
			environment,
			serverName,
			...(isTracingEnabled ? { tracesSampleRate } : {}),
			...(isProfilingEnabled ? { profilesSampleRate, profileLifecycle: 'trace' } : {}),
			beforeSend: this.beforeSend.bind(this) as NodeOptions['beforeSend'],
			ignoreTransactions: [`GET ${healthEndpoint}`, 'GET /metrics'],
			ignoreSpans: [`GET ${healthEndpoint}`, 'GET /metrics'],
			integrations: (integrations) => [
				...integrations.filter(({ name }) => enabledIntegrations.has(name)),
				rewriteFramesIntegration({ root: '/' }),
				requestDataIntegration({
					include: {
						cookies: false,
						data: false,
						headers: false,
						query_string: false,
						url: true,
					},
				}),
				...eventLoopBlockIntegration,
				...profilingIntegration,
			],
		});

		setTag('server_type', serverType);

		if (serverName) {
			setUser({ id: serverName });
		}

		this.report = (error, options) => captureException(error, options);
		this.beforeSendFilter = beforeSendFilter;
	}

	async beforeSend(event: ErrorEvent, hint: EventHint) {
		let { originalException } = hint;

		if (!originalException) return null;

		if (originalException instanceof Promise) {
			originalException = await originalException.catch((error) => error as Error);
		}

		if (
			this.beforeSendFilter?.(event, {
				...hint,
				originalException,
			})
		) {
			return null;
		}

		if (originalException instanceof AxiosError) return null;

		if (originalException instanceof BaseError) {
			if (!originalException.shouldReport) return null;

			this.extractEventDetailsFromN8nError(event, originalException);
		}

		if (this.isIgnoredSqliteError(originalException)) return null;
		if (originalException instanceof ApplicationError || originalException instanceof BaseError) {
			if (this.isIgnoredN8nError(originalException)) return null;

			this.extractEventDetailsFromN8nError(event, originalException);
		}

		if (
			originalException instanceof Error &&
			'cause' in originalException &&
			originalException.cause instanceof Error &&
			'level' in originalException.cause &&
			(originalException.cause.level === 'warning' || originalException.cause.level === 'info')
		) {
			// handle underlying errors propagating from dependencies like ai-assistant-sdk
			return null;
		}

		if (originalException instanceof Error && originalException.stack) {
			const eventHash = createHash('sha1').update(originalException.stack).digest('base64');
			if (this.seenErrors.has(eventHash)) return null;
			this.seenErrors.add(eventHash);
		}

		return event;
	}

	error(e: unknown, options?: ReportingOptions) {
		if (e instanceof ExecutionCancelledError) return;
		const toReport = this.wrap(e);
		if (toReport) this.report(toReport, options);
	}

	warn(warning: Error | string, options?: ReportingOptions) {
		this.error(warning, { ...options, level: 'warning' });
	}

	info(msg: string, options?: ReportingOptions) {
		this.report(msg, { ...options, level: 'info' });
	}

	private wrap(e: unknown) {
		if (e instanceof Error) return e;
		if (typeof e === 'string') return new ApplicationError(e);
		return;
	}

	/** @returns true if the error should be filtered out */
	private isIgnoredSqliteError(error: unknown) {
		return (
			error instanceof Error &&
			error.name === 'QueryFailedError' &&
			typeof error.message === 'string' &&
			['SQLITE_FULL', 'SQLITE_IOERR'].some((errMsg) => error.message.includes(errMsg))
		);
	}

	private isIgnoredN8nError(error: ApplicationError | BaseError) {
		return error.level === 'warning' || error.level === 'info';
	}

	private extractEventDetailsFromN8nError(
		event: ErrorEvent,
		originalException: ApplicationError | BaseError,
	) {
		const { level, extra, tags } = originalException;
		event.level = level;
		if (extra) event.extra = { ...event.extra, ...extra };
		if (tags) event.tags = { ...event.tags, ...tags };
	}

	private async getEventLoopBlockIntegration(tags: Record<string, string>, threshold?: number) {
		try {
			const { eventLoopBlockIntegration } = await import('@sentry/node-native');
			return [
				eventLoopBlockIntegration({
					...(threshold ? { threshold } : {}),
					staticTags: tags,
				}),
			];
		} catch {
			this.logger.warn(
				"Sentry's event loop block integration is disabled, because the native binary for `@sentry/node-native` was not found",
			);
			return [];
		}
	}

	private async getProfilingIntegration() {
		try {
			const { nodeProfilingIntegration } = await import('@sentry/profiling-node');
			return [nodeProfilingIntegration()];
		} catch {
			this.logger.warn(
				'Sentry profiling is disabled, because the `@sentry/profiling-node` package was not found',
			);
			return [];
		}
	}
}
