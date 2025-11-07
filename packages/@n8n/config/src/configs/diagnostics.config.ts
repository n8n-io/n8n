import { Config, Env } from '../decorators';

@Config
export class DiagnosticsConfig {
	/** Whether diagnostics are enabled. */
	@Env('N8N_DIAGNOSTICS_ENABLED')
	enabled: boolean = true;

	/**
	 * Legacy config fields - kept for compatibility but no longer used.
	 * Telemetry data is now stored locally only, with no external service integration.
	 */
	@Env('N8N_DIAGNOSTICS_CONFIG_FRONTEND')
	frontendConfig: string = '';

	@Env('N8N_DIAGNOSTICS_CONFIG_BACKEND')
	backendConfig: string = '';
}
