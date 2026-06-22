import { z } from 'zod';

import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

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
	 * Spans (`db`, `http.client`) shorter than this and not errored are dropped
	 * before being sent to Sentry, to cut auto-instrumentation trace volume
	 * while keeping slow/failed operations. In milliseconds.
	 *
	 * @default 1000
	 */
	@Env('N8N_SENTRY_TRACES_SLOW_SPAN_THRESHOLD_MS', z.number({ coerce: true }).int().positive())
	tracesSlowSpanThresholdMs: number = 1000;

	/**
	 * Whether Sentry's native event-loop-block detection is enabled. When on, a
	 * native watchdog (`@sentry/node-native`) captures the main thread's stack
	 * whenever the event loop is blocked beyond the threshold below.
	 *
	 * @default false
	 */
	@Env('N8N_SENTRY_EVENT_LOOP_BLOCK_DETECTION_ENABLED')
	eventLoopBlockDetectionEnabled: boolean = false;

	/**
	 * Threshold in milliseconds for event loop block detection.
	 * When the event loop is blocked for longer than this threshold,
	 * Sentry will report it.
	 *
	 * @default 500
	 */
	@Env('N8N_SENTRY_EVENT_LOOP_BLOCK_THRESHOLD', positiveIntSchema)
	eventLoopBlockThreshold: number = 500;

	/** Leaky-bucket cap on event loop block events reported per hour per instance. @default 5 */
	@Env('N8N_SENTRY_EVENT_LOOP_BLOCK_MAX_EVENTS_PER_HOUR', positiveIntSchema)
	eventLoopBlockMaxEventsPerHour: number = 5;

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
