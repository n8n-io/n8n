import { Config, Env } from '../decorators';

@Config
export class SentryConfig {
	/** Sentry DSN (data source name) for the backend. */
	@Env('N8N_SENTRY_DSN')
	backendDsn: string =
		'https://4848e2b8edebfea118dd4ad979c0694e@o1420875.ingest.us.sentry.io/4503924908883968';

	/** Sentry DSN (data source name) for the frontend. */
	@Env('N8N_FRONTEND_SENTRY_DSN')
	frontendDsn: string = '';

	/**
	 * Version of the n8n instance
	 *
	 * @example '1.73.0'
	 */
	@Env('N8N_VERSION')
	n8nVersion: string = 'debug-12949';

	/**
	 * Environment of the n8n instance.
	 *
	 * @example 'production'
	 */
	@Env('ENVIRONMENT')
	environment: string = 'debug-12949';

	/**
	 * Name of the deployment, e.g. cloud account name.
	 *
	 * @example 'janober'
	 */
	@Env('DEPLOYMENT_NAME')
	deploymentName: string = 'debug-12949';
}
