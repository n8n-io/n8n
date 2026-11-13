import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const portSchema = z.number({ coerce: true }).int().min(1).max(65535);

/**
 * Settings of the compiled workflow engine (proof of concept). The engine runs
 * workflows whose engine setting is `compiled` in the `wfrt` runtime.
 */
@Config
export class CompiledEngineConfig {
	/**
	 * Path to the `wfrt` runtime binary. When unset, n8n uses
	 * `workflow-runtime/zig-out/bin/wfrt` in the n8n source checkout.
	 */
	@Env('N8N_COMPILED_ENGINE_WFRT_PATH')
	wfrtPath: string = '';

	/**
	 * Path to the start script of the fallback host, the Node.js process that
	 * runs the nodes that `wfrt` can't run itself. When unset, n8n uses the
	 * built fallback host in the n8n source checkout.
	 */
	@Env('N8N_COMPILED_ENGINE_FALLBACK_HOST_PATH')
	fallbackHostPath: string = '';

	/**
	 * Port on which `wfrt` serves webhooks. n8n forwards production webhook
	 * requests of compiled workflows to this port on `127.0.0.1`.
	 */
	@Env('N8N_COMPILED_ENGINE_PORT', portSchema)
	port: number = 5690;

	/** Port of the admin API of `wfrt`. It listens on `127.0.0.1` only. */
	@Env('N8N_COMPILED_ENGINE_ADMIN_PORT', portSchema)
	adminPort: number = 5691;

	/**
	 * Secret that n8n sends to the admin API of `wfrt`. When unset, n8n makes a
	 * new random secret at each start. Set it only when you start `wfrt`
	 * yourself.
	 */
	@Env('N8N_COMPILED_ENGINE_ADMIN_SECRET')
	adminSecret: string = '';

	/**
	 * Whether n8n starts `wfrt` and the fallback host as child processes and
	 * restarts them when they stop. Set to `false` to connect to a `wfrt` that
	 * you start yourself.
	 */
	@Env('N8N_COMPILED_ENGINE_MANAGE_PROCESSES')
	manageProcesses: boolean = true;

	/**
	 * Maximum number of connections that `wfrt` accepts on its webhook port.
	 * Set to 0 to use the runtime's default.
	 */
	@Env('N8N_COMPILED_ENGINE_MAX_CONNECTIONS', z.number({ coerce: true }).int().min(0))
	maxConnections: number = 0;

	/**
	 * Workflow executions per second that `wfrt` sizes its tables for, together
	 * with the expected latency of the APIs that the workflows call. Set to 0 to
	 * use the fixed sizes of the embedded profile.
	 */
	@Env('N8N_COMPILED_ENGINE_TARGET_RATE', z.number({ coerce: true }).int().min(0))
	targetRate: number = 0;

	/**
	 * Expected response time of the APIs that compiled workflows call, in
	 * milliseconds. `wfrt` multiplies it by the target rate to size the
	 * executions and outbound requests that can wait at once. Used only when the
	 * target rate is set.
	 */
	@Env('N8N_COMPILED_ENGINE_VENDOR_LATENCY_MS', z.number({ coerce: true }).int().min(1))
	vendorLatencyMs: number = 300;

	/**
	 * Memory budget in megabytes for the outbound request and connection buffers
	 * of `wfrt`. Set to 0 for no budget. Used only when the target rate is set.
	 */
	@Env('N8N_COMPILED_ENGINE_MEMORY_MB', z.number({ coerce: true }).int().min(0))
	memoryMb: number = 0;

	/**
	 * Whether `wfrt` offers HTTP/2 to https APIs. An API that doesn't support it
	 * gets HTTP/1.1.
	 */
	@Env('N8N_COMPILED_ENGINE_HTTP2')
	http2: boolean = true;

	/**
	 * Longest wait for the next byte of a response from an API, in milliseconds.
	 * Set to 0 for no limit beyond the request timeout.
	 */
	@Env('N8N_COMPILED_ENGINE_READ_TIMEOUT_MS', z.number({ coerce: true }).int().min(0))
	readTimeoutMs: number = 0;

	/**
	 * Which outbound requests may share a connection. One of `shared`,
	 * `workflow` (each workflow has its own connections) or `credential` (each
	 * credential has its own connections). Use `workflow` when workflows of
	 * different projects must not share connections. It costs more connections.
	 */
	@Env('N8N_COMPILED_ENGINE_CONNECTION_POOL', z.enum(['shared', 'workflow', 'credential']))
	connectionPool: 'shared' | 'workflow' | 'credential' = 'shared';

	/**
	 * Limits for single APIs, as a semicolon-separated list of rules. Each rule is
	 * a host, optionally with a port or a `*.` prefix, then `key=value` pairs, for
	 * example `api.example.com conns=8 rate=50 timeout-ms=30000; *.slack.com inflight=20`.
	 * Keys are `conns`, `inflight`, `queue`, `rate`, `burst`, `connect-ms`,
	 * `read-ms`, `timeout-ms`, `h2` (`on`, `off`) and `aimd` (`on`, `off`).
	 */
	@Env('N8N_COMPILED_ENGINE_ORIGIN_LIMITS')
	originLimits: string = '';

	/**
	 * Folder for the execution log of `wfrt` and the compiled workflows. When
	 * unset, n8n uses the `compiled-engine` folder in the n8n user folder.
	 */
	@Env('N8N_COMPILED_ENGINE_DATA_DIR')
	dataDir: string = '';
}
