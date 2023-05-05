import config from '@/config';
import { ErrorReporterProxy } from 'n8n-workflow';

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

	const { init, captureException } = await import('@sentry/node');
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

	process.on('uncaughtException', (error) => {
		ErrorReporterProxy.error(error);
		if (error.constructor?.name !== 'AxiosError') throw error;
	});

	ErrorReporterProxy.init({
		report: (error, options) => captureException(error, options),
	});

	initialized = true;
};
