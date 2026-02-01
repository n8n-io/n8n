import { z } from 'zod';

import { Config, Env } from '../decorators';

/** Schema for sample rates (0.0 to 1.0). */
export const sampleRateSchema = z.number({ coerce: true }).min(0).max(1);

@Config
export class SentryConfig {
	/** Sentry DSN (data source name) for the backend. */
	@Env('N8N_SENTRY_DSN')
	backendDsn: string = '';

	/** Sentry DSN (data source name) for the frontend. */
	@Env('N8N_FRONTEND_SENTRY_DSN')
	frontendDsn: string = '';

	/**
	 * Sample rate for Sentry traces (0.0 to 1.0).
	 * This determines whether tracing is enabled and what percentage of
	 * transactions are traced.
	 *
	 * @default 0 (disabled)
	 */
	@Env('N8N_SENTRY_TRACES_SAMPLE_RATE', sampleRateSchema)
	tracesSampleRate: number = 0;

	/**
	 * Sample rate for Sentry profiling (0.0 to 1.0).
	 * This determines whether profiling is enabled and what percentage of
	 * transactions are profiled.
	 *
	 * @default 0 (disabled)
	 */
	@Env('N8N_SENTRY_PROFILES_SAMPLE_RATE', sampleRateSchema)
	profilesSampleRate: number = 0;

	/**
	 * Environment of the n8n instance.
	 *
	 * @example 'production'
	 */
	@Env('ENVIRONMENT')
	environment: string = '';

	/**
	 * Name of the deployment, e.g. cloud account name.
	 *
	 * @example 'janober'
	 */
	@Env('DEPLOYMENT_NAME')
	deploymentName: string = '';
}
