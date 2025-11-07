import { Config, Env } from '../decorators';

@Config
export class DiagnosticsConfig {
	/** Whether diagnostics are enabled. */
	@Env('N8N_DIAGNOSTICS_ENABLED')
	enabled: boolean = true;

	/** Diagnostics config for frontend. */
	@Env('N8N_DIAGNOSTICS_CONFIG_FRONTEND')
	frontendConfig: string = '';

	/** Diagnostics config for backend. */
	@Env('N8N_DIAGNOSTICS_CONFIG_BACKEND')
	backendConfig: string = '';
}
