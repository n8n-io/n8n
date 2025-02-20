import { Config, Env } from '../decorators';

@Config
export class GenericConfig {
	/** Default timezone for the n8n instance. Can be overridden on a per-workflow basis. */
	@Env('GENERIC_TIMEZONE')
	timezone: string = 'America/New_York';

	@Env('N8N_RELEASE_TYPE')
	releaseChannel: 'stable' | 'beta' | 'nightly' | 'dev' = 'dev';

	@Env('N8N_RELEASE_DATE')
	releaseDate?: Date;

	/** Grace period (in seconds) to wait for components to shut down before process exit. */
	@Env('N8N_GRACEFUL_SHUTDOWN_TIMEOUT')
	gracefulShutdownTimeout: number = 30;
}
