import { McpConnection } from '../runtime/mcp/mcp-connection';
import type { McpConnectionFailedEvent, McpServerConfig, McpVerifyResult } from '../types/sdk/mcp';
import type { BuiltTool } from '../types/sdk/tool';

function formatErrorWithCause(error: unknown): string {
	const stringify = (obj: unknown) => (obj instanceof Error ? obj.message : String(obj));
	if (!(error instanceof Error)) return stringify(error);

	const messages: string[] = [error.message];
	if (error.cause) {
		messages.push(stringify(error.cause));
	}

	return messages.join('. ');
}

/**
 * Manages connections to one or more MCP servers and exposes their tools
 * as a flat list of BuiltTool instances.
 *
 * Connections are established lazily on the first `listTools()` call and
 * kept alive until `close()` is called. Both operations deduplicate
 * concurrent calls via stored promises, so calling `listTools()` from
 * multiple concurrent `generate()` runs is safe.
 *
 * @example
 * ```typescript
 * const client = new McpClient([
 *   { name: 'browser', url: 'http://localhost:9222/mcp', transport: 'streamableHttp' },
 *   { name: 'fs', command: 'npx', args: ['@anthropic/mcp-fs', '/tmp'] },
 * ]);
 *
 * const agent = new Agent('assistant')
 *   .model('anthropic/claude-sonnet-4-5')
 *   .instructions('You are a helpful assistant.')
 *   .mcp(client);
 *
 * const result = await agent.generate('List files in /tmp');
 * await client.close();
 * ```
 */
export class McpClient {
	private readonly configs: McpServerConfig[];

	private connections: McpConnection[];

	private listToolsPromise: Promise<BuiltTool[]> | undefined;

	private closePromise: Promise<void> | undefined;

	/**
	 * Per-server connection failures recorded during the last `listTools()`.
	 * Tools from these servers were skipped; the run continues with the
	 * remaining servers' tools. Read via `getConnectionFailures()`.
	 */
	private connectionFailures: McpConnectionFailedEvent[] = [];

	/**
	 * @param configs - Server configurations. Each must have either `url` or `command`.
	 *   Duplicate names within the list are rejected.
	 */
	constructor(configs: McpServerConfig[]) {
		for (const cfg of configs) {
			if (!cfg.url && !cfg.command) {
				throw new Error(
					`MCP server "${cfg.name}": exactly one of "url" or "command" must be provided`,
				);
			}
			if (cfg.url && cfg.command) {
				throw new Error(`MCP server "${cfg.name}": provide either "url" or "command", not both`);
			}
		}

		const seen = new Set<string>();
		for (const cfg of configs) {
			if (seen.has(cfg.name)) {
				throw new Error(`MCP server name "${cfg.name}" is already registered`);
			}
			seen.add(cfg.name);
		}

		this.configs = configs;
		this.connections = configs.map((cfg) => new McpConnection(cfg));
	}

	/**
	 * Returns the names of all configured MCP servers. Does NOT require a
	 * network connection — safe to call before `listTools()` or `connect()`.
	 */
	get serverNames(): string[] {
		return this.configs.map((cfg) => cfg.name);
	}

	/**
	 * Explicitly connect to all servers without listing tools.
	 * Optional — `listTools()` connects implicitly.
	 */
	async connect(): Promise<void> {
		await this.listTools();
	}

	/**
	 * Connect to all servers (if not already connected) and return the full
	 * flat list of tools. Subsequent calls return the cached list without
	 * additional network round-trips. Servers that fail to connect are
	 * skipped (their tools are omitted and the failure is recorded via
	 * `getConnectionFailures()`); the call still resolves with the remaining
	 * servers' tools. On a hard error (e.g. tool-name collision) the cache is
	 * cleared so the caller can retry.
	 */
	async listTools(): Promise<BuiltTool[]> {
		if (!this.listToolsPromise) {
			const p = this.doListTools();
			this.listToolsPromise = p;
			p.catch(() => {
				if (this.listToolsPromise === p) this.listToolsPromise = undefined;
			});
		}
		return await this.listToolsPromise;
	}

	/**
	 * Disconnect from all servers. Subsequent calls are no-ops.
	 * Best-effort — errors are logged but not thrown.
	 */
	async close(): Promise<void> {
		this.closePromise ??= this.doClose();
		return await this.closePromise;
	}

	/**
	 * Verify connectivity to all configured servers.
	 * Each server is connected to with a temporary connection, its tools are
	 * listed, and the connection is closed — this does NOT affect the
	 * long-lived connections used by `listTools()`.
	 *
	 * Never throws — returns a result object indicating success or per-server
	 * errors so callers can handle partial failures gracefully.
	 *
	 * @example
	 * ```typescript
	 * const result = await client.verify();
	 * if (!result.ok) {
	 *   console.error('MCP connection failed:', result.errors);
	 * }
	 * ```
	 */
	async verify(): Promise<McpVerifyResult> {
		if (this.configs.length === 0) {
			return { ok: true, servers: [] };
		}

		const results = await Promise.allSettled(
			this.configs.map(async (cfg) => {
				const conn = new McpConnection(cfg);
				try {
					await conn.connect();
					const tools = await conn.listTools();
					return { name: cfg.name, tools: tools.length };
				} finally {
					await conn.disconnect().catch(() => {});
				}
			}),
		);

		const errors: Array<{ server: string; error: string }> = [];
		const servers: Array<{ name: string; tools: number }> = [];

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === 'rejected') {
				errors.push({
					server: this.configs[i].name,
					error: result.reason instanceof Error ? result.reason.message : String(result.reason),
				});
			} else {
				servers.push(result.value);
			}
		}

		return errors.length > 0 ? { ok: false, errors } : { ok: true, servers };
	}

	/**
	 * Returns true when any configured server declares per-server approval
	 * requirements (`requireApproval: true` or a non-empty `requireApproval`
	 * string array). Does NOT require a network connection.
	 *
	 * Used by the Agent builder to validate checkpoint configuration before
	 * attempting to connect.
	 */
	declaresApproval(): boolean {
		return this.connections.some((conn) => conn.declaresApproval());
	}

	/**
	 * Per-server connection failures recorded during the last `listTools()`.
	 * Empty when every server connected (or no servers were configured). Tools
	 * from these servers were skipped; the run continued with the remaining
	 * servers' tools. Callers (e.g. the agent runtime) surface these as
	 * non-fatal warnings to the user.
	 */
	getConnectionFailures(): readonly McpConnectionFailedEvent[] {
		return this.connectionFailures;
	}

	private async doListTools(): Promise<BuiltTool[]> {
		const connectedConnections: McpConnection[] = [];

		const settled = await Promise.allSettled(
			this.connections.map(async (conn) => {
				await conn.connect();
				return await conn.listTools();
			}),
		);

		// A failed server is non-fatal: skip its tools, record the failure,
		// and notify the observer. The run continues with the remaining
		// servers' tools so a single misconfigured or unhealthy MCP server
		// can't block inference.
		const failures: McpConnectionFailedEvent[] = [];
		for (let i = 0; i < settled.length; i++) {
			const result = settled[i];
			if (result.status === 'rejected') {
				const config = this.configs[i];
				const error = formatErrorWithCause(result.reason);
				failures.push({ server: config.name, error });
				// The transport may have opened before listTools threw; tear it
				// down so we don't keep an unusable connection alive for the run.
				// (connect() failing makes disconnect() a safe no-op.)
				await this.connections[i].disconnect().catch(() => {});
				await this.notifyConnectionFailed(config, error);
			} else {
				connectedConnections.push(this.connections[i]);
			}
		}
		this.connectionFailures = failures;

		const tools = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

		const seen = new Set<string>();
		const duplicates: string[] = [];
		for (const tool of tools) {
			if (seen.has(tool.name)) {
				duplicates.push(tool.name);
			}
			seen.add(tool.name);
		}

		if (duplicates.length > 0) {
			await Promise.allSettled(connectedConnections.map(async (c) => await c.disconnect()));
			throw new Error(
				`MCP tool name collision — the following tool names resolve to duplicates: ${duplicates.join(', ')}`,
			);
		}

		return tools;
	}

	private async notifyConnectionFailed(config: McpServerConfig, error: string): Promise<void> {
		try {
			await config.onConnectionFailed?.({ server: config.name, error });
		} catch (observerError) {
			console.error(
				`MCP connection-failed observer error for server "${config.name}":`,
				observerError,
			);
		}
	}

	private async doClose(): Promise<void> {
		await Promise.allSettled(
			this.connections.map(async (conn) => {
				try {
					await conn.disconnect();
				} catch (error) {
					console.error(`MCP disconnect error for server "${conn.name}":`, error);
				}
			}),
		);
	}
}
