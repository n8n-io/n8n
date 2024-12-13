import type { NodeOptions } from '@sentry/node';
import { close } from '@sentry/node';
import type { ErrorEvent, EventHint } from '@sentry/types';
import { AxiosError } from 'axios';
import { ApplicationError, LoggerProxy, type ReportingOptions } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { Service } from 'typedi';

import type { InstanceType } from './InstanceSettings';

@Service()
export class ErrorReporter {
	/** Hashes of error stack traces, to deduplicate error reports. */
	private seenErrors = new Set<string>();

	private report: (error: Error | string, options?: ReportingOptions) => void;

	constructor() {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		this.report = this.defaultReport;
	}

	private defaultReport(error: Error | string, options?: ReportingOptions) {
		if (error instanceof Error) {
			let e = error;

			const { executionId } = options ?? {};
			const context = executionId ? ` (execution ${executionId})` : '';

			do {
				const msg = [e.message + context, e.stack ? `\n${e.stack}\n` : ''].join('');
				const meta = e instanceof ApplicationError ? e.extra : undefined;
				LoggerProxy.error(msg, meta);
				e = e.cause as Error;
			} while (e);
		}
	}

	async shutdown(timeoutInMs = 1000) {
		await close(timeoutInMs);
	}

	async init(instanceType: InstanceType | 'task_runner', dsn: string) {
		process.on('uncaughtException', (error) => {
			this.error(error);
		});

		if (!dsn) return;

		// Collect longer stacktraces
		Error.stackTraceLimit = 50;

		const {
			N8N_VERSION: release,
			ENVIRONMENT: environment,
			DEPLOYMENT_NAME: serverName,
		} = process.env;

		const { init, captureException, setTag } = await import('@sentry/node');
		const { requestDataIntegration, rewriteFramesIntegration } = await import('@sentry/node');

		const enabledIntegrations = [
			'InboundFilters',
			'FunctionToString',
			'LinkedErrors',
			'OnUnhandledRejection',
			'ContextLines',
		];

		init({
			dsn,
			release,
			environment,
			enableTracing: false,
			serverName,
			beforeBreadcrumb: () => null,
			beforeSend: this.beforeSend.bind(this) as NodeOptions['beforeSend'],
			integrations: (integrations) => [
				...integrations.filter(({ name }) => enabledIntegrations.includes(name)),
				rewriteFramesIntegration({ root: process.cwd() }),
				requestDataIntegration({
					include: {
						cookies: false,
						data: false,
						headers: false,
						query_string: false,
						url: true,
						user: false,
					},
				}),
			],
		});

		setTag('server_type', instanceType);

		this.report = (error, options) => captureException(error, options);
	}

	async beforeSend(event: ErrorEvent, { originalException }: EventHint) {
		if (!originalException) return null;

		if (originalException instanceof Promise) {
			originalException = await originalException.catch((error) => error as Error);
		}

		if (originalException instanceof AxiosError) return null;

		if (
			originalException instanceof Error &&
			originalException.name === 'QueryFailedError' &&
			['SQLITE_FULL', 'SQLITE_IOERR'].some((errMsg) => originalException.message.includes(errMsg))
		) {
			return null;
		}

		if (originalException instanceof ApplicationError) {
			const { level, extra, tags } = originalException;
			if (level === 'warning') return null;
			event.level = level;
			if (extra) event.extra = { ...event.extra, ...extra };
			if (tags) event.tags = { ...event.tags, ...tags };
		}

		if (
			originalException instanceof Error &&
			'cause' in originalException &&
			originalException.cause instanceof Error &&
			'level' in originalException.cause &&
			originalException.cause.level === 'warning'
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
}
