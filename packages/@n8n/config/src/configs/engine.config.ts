import { z } from 'zod';

import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

/**
 * Floor for the CP → DP shared secret and the resume secret. Kept in step with
 * the engine, which rejects anything shorter.
 */
const SECRET_MIN_LENGTH = 32;

const engineModeSchema = z.enum(['in-process', 'remote']);

export type EngineMode = z.infer<typeof engineModeSchema>;

const engineDefaultTypeSchema = z.enum(['v1', 'v2']);

export type EngineDefaultType = z.infer<typeof engineDefaultTypeSchema>;

@Config
export class EngineConfig {
	/**
	 * Where the data plane runs. `in-process`: this main hosts it. `remote`:
	 * another process hosts it (`n8n engine`), and this main runs only the
	 * control plane side. Remote mode needs `N8N_ENGINE_BASE_URL` and
	 * `N8N_ENGINE_AUTH_SECRET`.
	 *
	 * In `remote` mode, this instance and every engine process use Redis. Set
	 * the same `QUEUE_BULL_REDIS_*` variables and `N8N_REDIS_KEY_PREFIX` on each
	 * of them, also when you don't use queue mode.
	 */
	@Env('N8N_ENGINE_MODE', engineModeSchema)
	mode: EngineMode = 'in-process';

	/**
	 * Execution engine for new workflows that don't set one, either `v1` or `v2`. When
	 * `N8N_ENABLED_MODULES` doesn't include `engine-v2`, new workflows use `v1` instead.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_DEFAULT_TYPE', engineDefaultTypeSchema)
	defaultType: EngineDefaultType = 'v1';

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
	 * engine runs out of process. The URL must reach an engine process that runs
	 * the `api` role.
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
	 * How many workflow steps one engine process runs at the same time, where
	 * each step is one run of one node. In `in-process` mode, the engine process
	 * is the n8n main process. A higher value uses more memory. An `n8n engine`
	 * process uses it only when it runs the `step-worker` role.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_STEP_CONCURRENCY', positiveIntSchema)
	stepConcurrency: number = 1;

	/**
	 * How many planning tasks one engine process runs at the same time. A
	 * planning task starts an execution, or decides what runs next after a step
	 * finishes. In `in-process` mode, the engine process is the n8n main
	 * process. An `n8n engine` process uses it only when it runs the
	 * `orchestrator` role.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_ORCHESTRATION_CONCURRENCY', positiveIntSchema)
	orchestrationConcurrency: number = 1;

	/**
	 * Comma-separated list of the engine roles an `n8n engine` process runs, for
	 * example `api,orchestrator`. `api` serves the engine API, `orchestrator`
	 * plans executions, and `step-worker` runs the nodes. When unset, the process
	 * runs all three, and the command's `--roles` flag overrides this variable.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_ROLES')
	roles: string = '';

	/**
	 * Maximum number of connections in the engine's Postgres connection pool, for
	 * each engine process. Raise it when the engine reports connection timeouts
	 * while the database responds normally.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_DATABASE_POOL_SIZE', positiveIntSchema)
	databasePoolSize: number = 10;

	/**
	 * How long in milliseconds the engine waits for a Postgres connection, either
	 * a new one or a free one from the pool. When the wait runs out, the work that
	 * needed the connection fails. A step can fail, or an execution can stop
	 * making progress.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_DATABASE_CONNECTION_TIMEOUT', positiveIntSchema.max(2147483647))
	databaseConnectionTimeoutMs: number = 20_000;

	/**
	 * Shared secret, at least 32 characters, that authenticates calls between the
	 * n8n main and the engine. Set the same value on the main and on every
	 * `n8n engine` process that runs the `api` or `step-worker` role. In
	 * `in-process` mode, n8n generates one when it's unset.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_AUTH_SECRET', z.string().min(SECRET_MIN_LENGTH))
	authSecret: string = '';

	/**
	 * Secret the data plane derives resume tokens from. A control plane in remote
	 * mode refuses to start with it set. Unset, the engine accepts no resume
	 * request. A value shorter than 32 characters counts as unset. A change
	 * invalidates every open resume URL.
	 *
	 * This is in development and not ready for use.
	 */
	@Env('N8N_ENGINE_RESUME_SECRET', z.string().min(SECRET_MIN_LENGTH))
	resumeSecret: string = '';

	/** Port the control plane server listens on. Its own, so it can be firewalled off from the editor API. */
	@Env('N8N_ENGINE_CONTROL_PLANE_PORT')
	controlPlanePort: number = 3001;

	/** Bind address for the control plane server. Loopback by default: only a data plane calls it. */
	@Env('N8N_ENGINE_CONTROL_PLANE_HOST')
	controlPlaneHost: string = '127.0.0.1';

	/**
	 * URL that the engine uses to reach the control plane server of the n8n main,
	 * for example `https://n8n-main:3001`. An `n8n engine` process that runs the
	 * `step-worker` role needs it. In `in-process` mode, the engine uses loopback
	 * when it's unset.
	 */
	@Env('N8N_ENGINE_CONTROL_PLANE_BASE_URL')
	controlPlaneBaseUrl: string = '';

	/**
	 * Path to this process's TLS certificate, in PEM format. The control plane
	 * and the engine use it as the server certificate and as the client
	 * certificate. It needs the `serverAuth` and `clientAuth` key usages, and its
	 * subject alternative name must match the host in the URL the other side
	 * dials. Set it together with `N8N_ENGINE_TLS_KEY_FILE` and
	 * `N8N_ENGINE_TLS_CA_FILE`. n8n reads the three files again when they
	 * change, so a renewed certificate applies to new connections without a
	 * restart. Mount the directory that holds the files, not single files.
	 * Kubernetes does not update a Secret mounted with `subPath`, and a Docker
	 * bind mount of a single file keeps the old file when the host replaces it.
	 */
	@Env('N8N_ENGINE_TLS_CERT_FILE')
	tlsCertFile: string = '';

	/**
	 * Path to the private key of `N8N_ENGINE_TLS_CERT_FILE`, in PEM format.
	 */
	@Env('N8N_ENGINE_TLS_KEY_FILE')
	tlsKeyFile: string = '';

	/**
	 * Path to the certificate authority bundle, in PEM format. The control plane
	 * and the engine accept only a peer whose certificate this authority signed.
	 */
	@Env('N8N_ENGINE_TLS_CA_FILE')
	tlsCaFile: string = '';

	/**
	 * Whether a control plane in remote mode and the engine can talk over plain
	 * HTTP. Without the three `N8N_ENGINE_TLS_*` files, both refuse to start
	 * unless you set this to `true`. Plain HTTP sends tokens and credentials
	 * unencrypted, so use it only for local development.
	 */
	@Env('N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP')
	tlsInsecureAllowPlainHttp: boolean = false;

	/**
	 * How long (in ms) the control plane waits for a run to answer before it
	 * answers the webhook request itself. The response channel is at-most-once,
	 * so a lost answer must not hold the request open forever. For a streaming
	 * request, each chunk starts the wait again, so this limits the silence
	 * between chunks, not the length of the stream.
	 */
	@Env('N8N_ENGINE_WEBHOOK_RESPONSE_TIMEOUT', positiveIntSchema.max(2147483647))
	webhookResponseTimeout: number = 2 * 60 * 1000;
}
