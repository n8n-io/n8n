/** Don't remove the .js extensions. That's how the @modelcontextprotocol/sdk is packaged. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { McpToolResolver } from './mcp-tool-resolver';
import { wrapToolForApproval } from '../sdk/tool';
import type { McpServerConfig } from '../types/sdk/mcp';
import type { BuiltTool } from '../types/sdk/tool';

/** The raw result returned by an MCP tool call. */
export type McpCallToolResult = CallToolResult;

/** Wraps a single MCP SDK Client instance for one server. Not publicly exported. */
export class McpConnection {
	private client: Client;

	private config: McpServerConfig;

	private readonly shouldRequireToolApproval: boolean;

	private connectionPromise: Promise<void> | undefined = undefined;
	private disconnectPromise: Promise<void> | undefined = undefined;
	private closed = false;

	constructor(config: McpServerConfig, requireToolApproval = false) {
		this.config = config;
		this.shouldRequireToolApproval = requireToolApproval;
		this.client = new Client({ name: '@n8n/agents', version: '0.1.0' }, { capabilities: {} });
	}

	async connect(): Promise<void> {
		if (this.connectionPromise !== undefined) {
			return await this.connectionPromise;
		}
		this.connectionPromise = this.connectWithTransport(this.createTransport(this.config));
		try {
			await this.connectionPromise;
		} catch (error) {
			this.connectionPromise = undefined;
			throw error;
		}
	}

	private async connectWithTransport(
		transport: SSEClientTransport | StreamableHTTPClientTransport | StdioClientTransport,
	): Promise<void> {
		const timeoutMs = this.config.connectionTimeoutMs;
		if (timeoutMs === undefined) {
			await this.client.connect(transport);
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
				this.client.connect(transport),
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
			await this.client.close().catch(() => {});
			throw error;
		} finally {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
		}
	}

	/** List tools from the server, resolving them into BuiltTool instances with prefixed names. */
	async listTools(): Promise<BuiltTool[]> {
		const result = await this.client.listTools();
		const resolver = new McpToolResolver();
		const tools = resolver.resolve(this, result.tools);
		return tools.map((t) =>
			t.suspendSchema || !this.needsApproval(t)
				? t
				: wrapToolForApproval(t, { requireApproval: true }),
		);
	}

	/**
	 * Returns true when a resolved tool should be wrapped with an approval gate.
	 *
	 * A tool needs approval when either:
	 * - the global `shouldRequireToolApproval` flag (set via Agent.requireToolApproval()) is true, OR
	 * - `config.requireApproval` is `true` (all tools on this server), OR
	 * - `config.requireApproval` is a string array that includes the tool's original (un-prefixed) name.
	 */
	private needsApproval(tool: BuiltTool): boolean {
		if (this.shouldRequireToolApproval) return true;

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
		const result = await this.client.callTool({ name, arguments: args }, CallToolResultSchema);
		return result as McpCallToolResult;
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
		await this.client.close();
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

	private createTransport(
		config: McpServerConfig,
	): SSEClientTransport | StreamableHTTPClientTransport | StdioClientTransport {
		if (config.command) {
			return new StdioClientTransport({
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
				return new StreamableHTTPClientTransport(url, { requestInit });
			}

			return new SSEClientTransport(url, { requestInit });
		}
		throw new Error(`MCP server "${config.name}": provide either "url" or "command"`);
	}
}
