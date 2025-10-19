import { inProduction, inTest, Logger } from '@n8n/backend-common';
import { type InstanceType } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { ReportingOptions } from '@n8n/errors';
import type { ErrorEvent, EventHint } from '@sentry/core';
import type { NodeOptions } from '@sentry/node';
import { AxiosError } from 'axios';
import { ApplicationError, ExecutionCancelledError, BaseError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

type ErrorReporterInitOptions = {
	serverType: InstanceType | 'task_runner';
	dsn: string;
	release: string;
	environment: string;
	serverName: string;
	releaseDate?: Date;

	/** Whether to enable event loop block detection, if Sentry is enabled. */
	withEventLoopBlockDetection: boolean;

	/**
	 * Function to allow filtering out errors before they are sent to Sentry.
	 * Return true if the error should be filtered out.
	 */
	beforeSendFilter?: (event: ErrorEvent, hint: EventHint) => boolean;
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

	constructor(private readonly logger: Logger) {
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

		const { init, captureException, setTag } = await import('@sentry/node');
		const { requestDataIntegration, rewriteFramesIntegration } = await import('@sentry/node');

		const enabledIntegrations = [
			'InboundFilters',
			'FunctionToString',
			'LinkedErrors',
			'OnUnhandledRejection',
			'ContextLines',
		];

		const eventLoopBlockIntegration = withEventLoopBlockDetection
			? // The EventLoopBlockIntegration doesn't automatically include the
				// same tags, so we set them explicitly.
				await this.getEventLoopBlockIntegration({
					server_name: serverName,
					server_type: serverType,
				})
			: [];

		init({
			dsn,
			release,
			environment,
			tracesSampleRate: inProduction ? 0.01 : 0,
			serverName,
			beforeBreadcrumb: () => null,
			beforeSend: this.beforeSend.bind(this) as NodeOptions['beforeSend'],
			integrations: (integrations) => [
				...integrations.filter(({ name }) => enabledIntegrations.includes(name)),
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
			],
		});

		setTag('server_type', serverType);

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

	private async getEventLoopBlockIntegration(tags: Record<string, string>) {
		try {
			const { eventLoopBlockIntegration } = await import('@sentry/node-native');
			return [
				eventLoopBlockIntegration({
					staticTags: tags,
				}),
			];
		} catch {
			this.logger.debug(
				"Sentry's event loop block integration is disabled, because the native binary for `@sentry/node-native` was not found",
			);
			return [];
		}
	}
}
