import { Config, Env } from '@n8n/config';

@Config
export class EngineConfig {
	/** Port the engine HTTP server listens on. */
	@Env('PORT')
	port: number = 3000;

	/** Host interface the engine HTTP server binds to. */
	@Env('HOST')
	host: string = '0.0.0.0';

	/**
	 * Postgres connection URL for the data plane. When empty, the engine boots
	 * in healthcheck-only mode — workflow execution endpoints are not mounted.
	 */
	@Env('DP_DATABASE_URL')
	databaseUrl: string = '';
}
