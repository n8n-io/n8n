import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';
import type { Application } from 'express';
import config from '../config';

let initialized = false;

export const initErrorHandling = (app?: Application) => {
	if (initialized) return;

	if (!config.getEnv('diagnostics.enabled')) {
		initialized = true;
		return;
	}

	const dsn = config.getEnv('diagnostics.config.sentry.dsn');
	const { N8N_VERSION: release, ENVIRONMENT: environment } = process.env;

	Sentry.init({
		dsn,
		release,
		environment,
		integrations: (defaults) => {
			const integrations = defaults.filter(
				(i) => !['Console', 'Modules', 'Context', 'LinkedErrors'].includes(i.name),
			);
			integrations.push(new RewriteFrames({ root: process.cwd() }));
			return integrations;
		},
	});

	if (app) {
		const { requestHandler, errorHandler } = Sentry.Handlers;
		app.use(requestHandler());
		app.use(errorHandler());
	}

	initialized = true;
};

export const captureError = Sentry.captureException;
