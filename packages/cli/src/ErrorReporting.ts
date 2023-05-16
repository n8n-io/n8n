import { createHash } from 'crypto';
import config from '@/config';
import { ErrorReporterProxy, NodeError } from 'n8n-workflow';

let initialized = false;

export const initErrorHandling = async () => {
	if (initialized) return;

	if (!config.getEnv('diagnostics.enabled')) {
		initialized = true;
		return;
	}

	// Collect longer stacktraces
	Error.stackTraceLimit = 50;

	const dsn = config.getEnv('diagnostics.config.sentry.dsn');
	const { N8N_VERSION: release, ENVIRONMENT: environment } = process.env;

	const { init, captureException, addGlobalEventProcessor } = await import('@sentry/node');
	// eslint-disable-next-line @typescript-eslint/naming-convention
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
		if (originalException instanceof NodeError && originalException.severity === 'warning')
			return null;
		if (!event.exception) return null;
		const eventHash = createHash('sha1').update(JSON.stringify(event.exception)).digest('base64');
		if (seenErrors.has(eventHash)) return null;
		seenErrors.add(eventHash);
		return event;
	});

	process.on('uncaughtException', (error) => {
		ErrorReporterProxy.error(error);
		if (error.constructor?.name !== 'AxiosError') throw error;
	});

	ErrorReporterProxy.init({
		report: (error, options) => captureException(error, options),
	});

	initialized = true;
};
