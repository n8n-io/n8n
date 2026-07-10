/* eslint-disable @typescript-eslint/consistent-type-imports */
/** Don't remove the .js extensions. That's how the @modelcontextprotocol/sdk is packaged. */
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { McpToolResolver } from './mcp-tool-resolver';
import { wrapToolForApproval } from '../../sdk/tool';
import type { McpServerConfig, McpToolCallSettledEvent } from '../../types/sdk/mcp';
import type { BuiltTool } from '../../types/sdk/tool';

/** The raw result returned by an MCP tool call. */
export type McpCallToolResult = CallToolResult;

/**
 * Import the @modelcontextprotocol/sdk client subpaths. Every SDK type used in
 * this file is derived from this function's inferred return type. That keeps a
 * single source of truth for module resolution: under NodeNext these value-space
 * dynamic imports resolve to the SDK's ESM declarations, whereas static `import
 * type` / `typeof import(...)` in this CommonJS-context file would resolve to the
 * CJS declarations — and the two are nominally incompatible (the Client/transport
 * classes carry private members). Deriving from here sidesteps that mismatch.
 */
async function importMcpSdk() {
	const [
		{ Client },
		{ SSEClientTransport },
		{ StdioClientTransport },
		{ StreamableHTTPClientTransport },
		{ CallToolResultSchema },
	] = await Promise.all([
		import('@modelcontextprotocol/sdk/client/index.js'),
		import('@modelcontextprotocol/sdk/client/sse.js'),
		import('@modelcontextprotocol/sdk/client/stdio.js'),
		import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
		import('@modelcontextprotocol/sdk/types.js'),
	]);
	return {
		Client,
		SSEClientTransport,
		StdioClientTransport,
		StreamableHTTPClientTransport,
		CallToolResultSchema,
	};
}

type McpSdkModule = Awaited<ReturnType<typeof importMcpSdk>>;
type McpClient = InstanceType<McpSdkModule['Client']>;
type McpTransport =
	| InstanceType<McpSdkModule['SSEClientTransport']>
	| InstanceType<McpSdkModule['StreamableHTTPClientTransport']>
	| InstanceType<McpSdkModule['StdioClientTransport']>;

let mcpSdkPromise: Promise<McpSdkModule> | undefined;

/**
 * Load the @modelcontextprotocol/sdk client subpaths on first use. Deferred so
 * the agents module's startup cost stays low — the SDK loads ~12 MB of code
 * that is only needed once a user actually configures an MCP server.
 */
async function loadMcpSdk(): Promise<McpSdkModule> {
	mcpSdkPromise ??= importMcpSdk();
	return await mcpSdkPromise;
}

function applyToolFilter<T extends { name: string }>(
	tools: T[],
	toolFilter: McpServerConfig['toolFilter'],
): T[] {
	if (!toolFilter?.mode || !toolFilter?.tools) {
		return tools;
	}

	const filterSet = new Set(toolFilter.tools);
	if (toolFilter.mode === 'allow') {
		return tools.filter((tool) => filterSet.has(tool.name));
	} else if (toolFilter.mode === 'exclude') {
		return tools.filter((tool) => !filterSet.has(tool.name));
	}

	// Return tools as-is if `mode` is not `'allow' | 'exclude'` for some reason
	return tools;
}

/** Wraps a single MCP SDK Client instance for one server. Not publicly exported. */
export class McpConnection {
	private client: McpClient | undefined;

	private config: McpServerConfig;

	private connectionPromise: Promise<void> | undefined = undefined;
	private disconnectPromise: Promise<void> | undefined = undefined;
	private closed = false;

	constructor(config: McpServerConfig) {
		this.config = config;
	}

	async connect(): Promise<void> {
		if (this.connectionPromise !== undefined) {
			return await this.connectionPromise;
		}
		const sdk = await loadMcpSdk();
		this.client = new sdk.Client({ name: '@n8n/agents', version: '0.1.0' }, { capabilities: {} });
		this.connectionPromise = this.connectWithTransport(this.createTransport(this.config, sdk));
		try {
			await this.connectionPromise;
		} catch (error) {
			this.connectionPromise = undefined;
			throw error;
		}
	}

	private async connectWithTransport(transport: McpTransport): Promise<void> {
		if (!this.client) throw new Error('MCP client not initialized; connect() must be called first');
		const client = this.client;
		const timeoutMs = this.config.connectionTimeoutMs;
		if (timeoutMs === undefined) {
			await client.connect(transport);
			return;
		}
		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
			throw new Error(
				`MCP server "${this.config.name}": connectionTimeoutMs must be a positive finite number`,
			);
		}
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		try {
			await Promise.race([
				client.connect(transport),
				new Promise<never>((_, reject) => {
					timeoutId = setTimeout(() => {
						reject(
							new Error(
								`MCP server "${this.config.name}": connection timed out after ${timeoutMs}ms`,
							),
						);
					}, timeoutMs);
				}),
			]);
		} catch (error) {
			await client.close().catch(() => {});
			throw error;
		} finally {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
		}
	}

	/** List tools from the server, resolving them into BuiltTool instances with prefixed names. */
	async listTools(): Promise<BuiltTool[]> {
		if (!this.client) throw new Error('MCP client not initialized; connect() must be called first');
		const result = await this.client.listTools();
		const resolver = new McpToolResolver();
		const filteredRawTools = applyToolFilter(result.tools, this.config.toolFilter);
		const tools = resolver.resolve(this, filteredRawTools);
		return tools.map((t) =>
			t.suspendSchema || !this.shouldRequireToolApproval(t)
				? t
				: wrapToolForApproval(t, { requireApproval: true }),
		);
	}

	/**
	 * Returns true when a resolved tool should be wrapped with an approval gate.
	 *
	 * A tool needs approval when either:
	 * - `config.requireApproval` is `true` (all tools on this server), OR
	 * - `config.requireApproval` is a string array that includes the tool's original (un-prefixed) name.
	 */
	private shouldRequireToolApproval(tool: BuiltTool): boolean {
		const { requireApproval } = this.config;
		if (requireApproval === true) return true;

		if (Array.isArray(requireApproval) && requireApproval.length > 0) {
			const prefix = `${this.config.name}_`;
			const originalName = tool.name.startsWith(prefix)
				? tool.name.slice(prefix.length)
				: tool.name;
			return requireApproval.includes(originalName);
		}

		return false;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<McpCallToolResult> {
		if (!this.client) throw new Error('MCP client not initialized; connect() must be called first');
		const { CallToolResultSchema } = await loadMcpSdk();
		try {
			const result = (await this.client.callTool(
				{ name, arguments: args },
				CallToolResultSchema,
			)) as McpCallToolResult;
			await this.notifyToolCallSettled({ toolName: name, success: result.isError !== true });
			return result;
		} catch (error) {
			await this.notifyToolCallSettled({ toolName: name, success: false });
			throw error;
		}
	}

	private async notifyToolCallSettled(event: McpToolCallSettledEvent): Promise<void> {
		try {
			await this.config.onToolCallSettled?.(event);
		} catch (error) {
			console.error(`MCP tool call observer error for server "${this.config.name}":`, error);
		}
	}

	async disconnect(): Promise<void> {
		if (this.disconnectPromise) return await this.disconnectPromise;
		const promise = this.doDisconnect();
		this.disconnectPromise = promise;
		return await promise.finally(() => {
			if (this.disconnectPromise === promise) this.disconnectPromise = undefined;
		});
	}

	private async doDisconnect(): Promise<void> {
		if (this.closed) return;
		if (this.client) await this.client.close();
		this.connectionPromise = undefined;
		this.closed = true;
	}

	get name(): string {
		return this.config.name;
	}

	/**
	 * Returns true when this server's config declares per-server approval requirements
	 * without requiring a network connection.
	 */
	declaresApproval(): boolean {
		const { requireApproval } = this.config;
		return (
			requireApproval === true || (Array.isArray(requireApproval) && requireApproval.length > 0)
		);
	}

	private createTransport(config: McpServerConfig, sdk: McpSdkModule): McpTransport {
		if (config.command) {
			return new sdk.StdioClientTransport({
				command: config.command,
				args: config.args,
				env: config.env,
			});
		} else if (config.url) {
			const url = new URL(config.url);
			const requestInit: RequestInit | undefined = config.headers
				? { headers: config.headers }
				: undefined;

			if (config.transport === 'streamableHttp') {
				return new sdk.StreamableHTTPClientTransport(url, {
					requestInit,
					fetch: config.fetch,
				});
			}

			return new sdk.SSEClientTransport(url, {
				requestInit,
				fetch: config.fetch,
				eventSourceInit: config.fetch ? { fetch: config.fetch } : undefined,
			});
		}
		throw new Error(`MCP server "${config.name}": provide either "url" or "command"`);
	}
}
