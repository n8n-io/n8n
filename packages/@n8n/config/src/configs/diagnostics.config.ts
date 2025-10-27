import { Config, Env, Nested } from '../decorators';

@Config
class PostHogConfig {
	/** API key for PostHog. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_KEY')
	apiKey: string = 'phc_4URIAm1uYfJO7j8kWSe0J8lc8IqnstRLS7Jx8NcakHo';

	/** API host for PostHog. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_HOST')
	apiHost: string = 'https://us.i.posthog.com';
}

@Config
export class DiagnosticsConfig {
	/** Whether diagnostics are enabled. */
	@Env('N8N_DIAGNOSTICS_ENABLED')
	enabled: boolean = true;

	/** Diagnostics config for frontend. */
	@Env('N8N_DIAGNOSTICS_CONFIG_FRONTEND')
	frontendConfig: string = '1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.n8n.io';

	/** Diagnostics config for backend. */
	@Env('N8N_DIAGNOSTICS_CONFIG_BACKEND')
	backendConfig: string = '1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.n8n.io';

	@Nested
	posthogConfig: PostHogConfig;
}
