import { createHash } from 'crypto';
import config from '@/config';
import { ErrorReporterProxy, ExecutionBaseError } from 'n8n-workflow';

let initialized = false;

export const initErrorHandling = async () => {
	if (initialized) return;

	process.on('uncaughtException', (error) => {
		ErrorReporterProxy.error(error);
	});

	const dsn = config.getEnv('diagnostics.config.sentry.dsn');
	if (!config.getEnv('diagnostics.enabled') || !dsn) {
		initialized = true;
		return;
	}

	// Collect longer stacktraces
	Error.stackTraceLimit = 50;

	const { N8N_VERSION: release, ENVIRONMENT: environment } = process.env;

	const { init, captureException, addGlobalEventProcessor } = await import('@sentry/node');

	const { RewriteFrames } = await import('@sentry/integrations');

	init({
		dsn,
		release,
		environment,
		integrations: (integrations) => {
			integrations = integrations.filter(({ name }) => name !== 'OnUncaughtException');
			integrations.push(new RewriteFrames({ root: process.cwd() }));
			return integrations;
		},
	});

	const seenErrors = new Set<string>();
	addGlobalEventProcessor((event, { originalException }) => {
		if (originalException instanceof ExecutionBaseError && originalException.severity === 'warning')
			return null;
		if (!event.exception) return null;
		const eventHash = createHash('sha1').update(JSON.stringify(event.exception)).digest('base64');
		if (seenErrors.has(eventHash)) return null;
		seenErrors.add(eventHash);

		if (originalException instanceof ErrorReporterProxy.BaseReportedError) {
			const options = originalException.reportingOptions;
			event.level = options.level ?? event.level;

			if (options.tags) {
				event.tags = {
					...(event.tags ?? {}),
					...options.tags,
				};
			}

			if (options.extra) {
				event.extra = {
					...(event.extra ?? {}),
					...options.extra,
				};
			}
		}

		return event;
	});

	ErrorReporterProxy.init({
		report: (error, options) => captureException(error, options),
	});

	initialized = true;
};
