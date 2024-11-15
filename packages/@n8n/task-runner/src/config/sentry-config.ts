import { Config, Env } from '@n8n/config';

@Config
export class SentryConfig {
	/** Sentry DSN */
	@Env('N8N_SENTRY_DSN')
	sentryDsn: string = '';

	//#region Metadata about the environment

	@Env('N8N_VERSION')
	n8nVersion: string = '';

	@Env('ENVIRONMENT')
	environment: string = '';

	@Env('DEPLOYMENT_NAME')
	deploymentName: string = '';

	//#endregion
}
