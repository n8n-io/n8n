import { Config, Env, Nested } from '../decorators';

@Config
class PostHogConfig {
	/** API key for PostHog. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_KEY')
	apiKey: string = '';

	/** API host for PostHog. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_HOST')
	apiHost: string = '';
}

@Config
export class DiagnosticsConfig {
	/** Whether diagnostics are enabled. */
	enabled: boolean = false;

	/** Diagnostics config for frontend. */
	frontendConfig: string = ';';

	/** Diagnostics config for backend. */
	backendConfig: string = ';';

	@Nested
	posthogConfig: PostHogConfig;
}
