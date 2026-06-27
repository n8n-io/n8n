import { Config, Env, Nested } from '../decorators';
import { nonnegativeIntSchema } from '../schemas';

@Config
class PostHogConfig {
	/** PostHog project API key for product analytics. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_KEY')
	apiKey: string = 'phc_kMstNfAgBcBkWSh6KdsgN09heqqNe5VNmalHP1Ni9Q4';

	/** PostHog API host URL. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_HOST')
	apiHost: string = 'https://ph.n8n.io';
}

@Config
export class DiagnosticsConfig {
	/** Whether anonymous diagnostics and telemetry are enabled for this instance. */
	@Env('N8N_DIAGNOSTICS_ENABLED')
	enabled: boolean = true;

	/** Telemetry endpoint config for the frontend (format: key;baseUrl). */
	@Env('N8N_DIAGNOSTICS_CONFIG_FRONTEND')
	frontendConfig: string = '1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.n8n.io';

	/** Telemetry endpoint config for the backend (format: key;baseUrl). */
	@Env('N8N_DIAGNOSTICS_CONFIG_BACKEND')
	backendConfig: string = '1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.n8n.io';

	@Nested
	posthogConfig: PostHogConfig;

	/** Max requests per IP per minute to the identify/track telemetry proxy routes (`0` disables). */
	@Env('N8N_TELEMETRY_RATE_LIMIT', nonnegativeIntSchema)
	telemetryRateLimit: number = 100;

	/** Max requests per IP per minute to the page and Rudderstack source-config routes (`0` disables). */
	@Env('N8N_TELEMETRY_SOURCE_RATE_LIMIT', nonnegativeIntSchema)
	telemetrySourceRateLimit: number = 50;
}
