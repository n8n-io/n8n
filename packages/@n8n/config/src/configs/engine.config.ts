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

	/**
	 * Port the control plane server listens on.
	 *
	 * Deliberately not n8n's own port: this surface serves the data plane and
	 * nothing else, so it is a separate server on a separate port that can be
	 * firewalled off from the editor API.
	 */
	@Env('N8N_ENGINE_CONTROL_PLANE_PORT')
	controlPlanePort: number = 3001;

	/**
	 * Host interface the control plane server binds to.
	 *
	 * Loopback by default, unlike {@link host}: when both planes share a process
	 * there is nothing to reach across the network, and an internal surface that
	 * is unreachable off-box by default is the safer starting point. A deployment
	 * whose data plane runs elsewhere must widen this deliberately.
	 */
	@Env('N8N_ENGINE_CONTROL_PLANE_HOST')
	controlPlaneHost: string = '127.0.0.1';

	/**
	 * Base URL the engine dials to reach the control plane server.
	 *
	 * The mirror image of {@link baseUrl}: that one is how the control plane
	 * reaches the engine, this one is how the engine reaches back. Both
	 * directions are HTTP from day one, including while the engine runs inside
	 * the n8n process, so the engine can move out of it without changing a caller.
	 *
	 * Defaults to loopback on {@link controlPlanePort}. Set it whenever that is not
	 * dialable, for example once the engine runs out of process.
	 */
	@Env('N8N_ENGINE_CONTROL_PLANE_BASE_URL')
	controlPlaneBaseUrl: string = '';
}
