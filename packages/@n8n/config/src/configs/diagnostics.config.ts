import { Config, Env, Nested } from '../decorators';

@Config
class PostHogConfig {
	/** PostHog project API key for product analytics. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_KEY')
	apiKey: string = 'phc_4URIAm1uYfJO7j8kWSe0J8lc8IqnstRLS7Jx8NcakHo';

	/** PostHog API host URL. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_HOST')
	apiHost: string = 'https://us.i.posthog.com';
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
}
