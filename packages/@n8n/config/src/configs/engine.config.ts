import { Config, Env } from '../decorators';

@Config
export class EngineConfig {
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
