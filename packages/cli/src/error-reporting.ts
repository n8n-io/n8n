import Sentry from '@sentry/node';
import { createHash } from 'crypto';
import { ErrorReporterProxy, ApplicationError } from 'n8n-workflow';

// Collect longer stacktraces
Error.stackTraceLimit = 50;

process.on('uncaughtException', (error) => {
	ErrorReporterProxy.error(error);
});

const {
	SENTRY_DSN: dsn,
	N8N_VERSION: release,
	ENVIRONMENT: environment,
	DEPLOYMENT_NAME: serverName,
} = process.env;

const enabledIntegrations = [
	'InboundFilters',
	'FunctionToString',
	'LinkedErrors',
	'OnUnhandledRejection',
	'ContextLines',
];

const seenErrors = new Set<string>();
Sentry.init({
	dsn,
	release,
	environment,
	enableTracing: false,
	serverName,
	beforeBreadcrumb: () => null,
	integrations: (integrations) => [
		...integrations.filter(({ name }) => enabledIntegrations.includes(name)),
		Sentry.rewriteFramesIntegration({ root: process.cwd() }),
		Sentry.requestDataIntegration({
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
	beforeSend(event, { originalException }) {
		if (!(originalException instanceof Error)) return null;

		if (
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

		if (originalException instanceof Error && originalException.stack) {
			const eventHash = createHash('sha1').update(originalException.stack).digest('base64');
			if (seenErrors.has(eventHash)) return null;
			seenErrors.add(eventHash);
		}

		return event;
	},
});

ErrorReporterProxy.init({
	report: (error, options) => Sentry.captureException(error, options),
});
