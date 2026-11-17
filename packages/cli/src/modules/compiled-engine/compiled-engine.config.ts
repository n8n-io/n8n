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

	/**
	 * IPv4 address on which `wfrt` listens for webhooks, for example `127.0.0.1` or
	 * `0.0.0.0`. n8n forwards webhook requests to `wfrt` on this machine, so change it only
	 * when another machine must reach `wfrt` directly. Requests that reach `wfrt` directly
	 * don't pass through n8n.
	 */
	@Env('N8N_COMPILED_ENGINE_LISTEN_ADDRESS', z.string().ip({ version: 'v4' }))
	listenAddress: string = '127.0.0.1';

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
	 * Whether n8n compiles a node from its own code when the compiled engine has
	 * no built-in version of that node. This applies to community and custom
	 * nodes too. n8n runs a compiled node only when it has checked that node
	 * operation against the original node. Other nodes still run in the fallback
	 * host. When `false`, every node without a built-in version runs in the
	 * fallback host.
	 */
	@Env('N8N_COMPILED_ENGINE_COMPILE_NODES')
	compileNodes: boolean = false;

	/**
	 * Whether the compiled engine runs the **Execute Query** operation of the
	 * MySQL node in `wfrt`. When `false`, every MySQL node runs in the fallback
	 * host. This applies only when n8n starts `wfrt`. If you start `wfrt`
	 * yourself, also start it with `--sql-mysql`.
	 */
	@Env('N8N_COMPILED_ENGINE_SQL_MYSQL')
	sqlMysql: boolean = false;

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

	/**
	 * Size limit in megabytes for the compiled workflows that n8n keeps on disk.
	 * When the compiled workflows reach the limit, n8n removes the ones that it
	 * used least recently. Set to 0 to keep no compiled workflows on disk.
	 */
	@Env('N8N_COMPILED_ENGINE_ARTIFACT_CACHE_MB', z.number({ coerce: true }).int().min(0))
	artifactCacheMb: number = 256;
}
