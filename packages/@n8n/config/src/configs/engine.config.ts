import { z } from 'zod';

import { Config, Env } from '../decorators';

/**
 * Floor for the CP → DP shared secret. Kept in step with the engine's identity
 * verifier, which rejects anything shorter.
 */
const AUTH_SECRET_MIN_LENGTH = 32;

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

	/**
	 * Shared secret the control plane signs its identity token with and the engine
	 * verifies against. Both planes must hold the same value.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_AUTH_SECRET', z.string().min(AUTH_SECRET_MIN_LENGTH))
	authSecret: string = '';

	/** Port the control plane server listens on. Its own, so it can be firewalled off from the editor API. */
	@Env('N8N_ENGINE_CONTROL_PLANE_PORT')
	controlPlanePort: number = 3001;

	/** Bind address for the control plane server. Loopback by default: only a data plane calls it. */
	@Env('N8N_ENGINE_CONTROL_PLANE_HOST')
	controlPlaneHost: string = '127.0.0.1';

	/** Where the engine dials the control plane server. Defaults to loopback; set it when that is not reachable. */
	@Env('N8N_ENGINE_CONTROL_PLANE_BASE_URL')
	controlPlaneBaseUrl: string = '';

	/**
	 * Engine a workflow runs on when it carries no `engineType` setting of its
	 * own. `v2` points an instance's whole manual traffic at engine 2.0, for
	 * dogfooding and e2e runs where setting it per workflow is impractical. A
	 * workflow that names an engine always keeps it.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_DEFAULT_ENGINE_TYPE', z.enum(['v1', 'v2']))
	defaultEngineType: 'v1' | 'v2' = 'v1';
}
