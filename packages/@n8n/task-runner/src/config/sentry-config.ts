import { Config, Env, sampleRateSchema } from '@n8n/config';

@Config
export class SentryConfig {
	/** Sentry DSN (data source name) */
	@Env('N8N_SENTRY_DSN')
	dsn: string = '';

	/**
	 * Sample rate for Sentry profiling (0.0 to 1.0).
	 * This determines what percentage of transactions are profiled.
	 *
	 * @default 0 (disabled)
	 */
	@Env('N8N_SENTRY_PROFILES_SAMPLE_RATE', sampleRateSchema)
	profilesSampleRate: number = 0;

	/**
	 * Sample rate for Sentry traces (0.0 to 1.0).
	 * This determines what percentage of transactions are profiled.
	 *
	 * @default 0 (disabled)
	 */
	@Env('N8N_SENTRY_TRACES_SAMPLE_RATE', sampleRateSchema)
	tracesSampleRate: number = 0;

	//#region Metadata about the environment

	@Env('N8N_VERSION')
	n8nVersion: string = '';

	@Env('ENVIRONMENT')
	environment: string = '';

	@Env('DEPLOYMENT_NAME')
	deploymentName: string = '';

	//#endregion
}
