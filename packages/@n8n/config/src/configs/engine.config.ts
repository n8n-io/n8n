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
	 * Postgres connection URL for the data plane. When empty, the engine boots
	 * in healthcheck-only mode — workflow execution endpoints are not mounted.
	 */
	@Env('N8N_ENGINE_DATABASE_URL')
	databaseUrl: string = '';
}
