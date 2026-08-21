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
	 * Base URL the control plane dials to reach the engine.
	 *
	 * Deliberately separate from `host` and `port`, which are a *bind* address:
	 * a wildcard bind (`0.0.0.0`) is not a destination, and a bind to one
	 * interface is not reachable on loopback. Defaults to loopback on `port`.
	 *
	 * Set this whenever the engine does not answer on `http://127.0.0.1:<port>`,
	 * for example when `N8N_ENGINE_HOST` names a specific interface, or once the
	 * engine runs out of process.
	 */
	@Env('N8N_ENGINE_BASE_URL')
	baseUrl: string = '';

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
