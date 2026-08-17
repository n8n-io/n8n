import { Config, Env } from '../decorators';

@Config
export class EngineConfig {
	/** Whether the EXPERIMENTAL engine 2.0 is enabled. When enabled, workflows with `engineType: 'v2'` are dispatched to the new engine. */
	@Env('N8N_ENGINE_V2_ENABLED')
	v2Enabled: boolean = false;

	/** Port the engine HTTP server listens on. */
	@Env('N8N_ENGINE_PORT')
	port: number = 3000;

	/** Host interface the engine HTTP server binds to. */
	@Env('N8N_ENGINE_HOST')
	host: string = '0.0.0.0';

	/**
	 * Postgres connection URL for the engine's data plane. When unset, the
	 * engine boots in healthcheck-only mode and workflow execution endpoints
	 * are not mounted.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_DATABASE_URL')
	databaseUrl: string = '';
}
