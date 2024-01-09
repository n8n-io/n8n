import { createHash } from 'crypto';
import config from '@/config';
import { ErrorReporterProxy, ApplicationError } from 'n8n-workflow';

let initialized = false;

export const initErrorHandling = async () => {
	if (initialized) return;

	process.on('uncaughtException', (error) => {
		ErrorReporterProxy.error(error);
	});

	const dsn = config.getEnv('diagnostics.config.sentry.dsn');
	if (!dsn) {
		initialized = true;
		return;
	}

	// Collect longer stacktraces
	Error.stackTraceLimit = 50;

	const {
		N8N_VERSION: release,
		ENVIRONMENT: environment,
		DEPLOYMENT_NAME: serverName,
	} = process.env;

	const { init, captureException, addEventProcessor } = await import('@sentry/node');

	const { RewriteFrames } = await import('@sentry/integrations');
	const { Integrations } = await import('@sentry/node');

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
		integrations: (integrations) => [
			...integrations.filter(({ name }) => enabledIntegrations.includes(name)),
			new RewriteFrames({ root: process.cwd() }),
			new Integrations.RequestData({
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

	const seenErrors = new Set<string>();
	addEventProcessor((event, { originalException }) => {
		if (!originalException) return null;

		if (originalException instanceof ApplicationError) {
			const { level, extra, tags } = originalException;
			if (level === 'warning') return null;
			event.level = level;
			if (extra) event.extra = { ...event.extra, ...extra };
			if (tags) event.tags = { ...event.tags, ...tags };
		}

		const eventHash = createHash('sha1').update(JSON.stringify(originalException)).digest('base64');
		if (seenErrors.has(eventHash)) return null;
		seenErrors.add(eventHash);

		return event;
	});

	ErrorReporterProxy.init({
		report: (error, options) => captureException(error, options),
	});

	initialized = true;
};
