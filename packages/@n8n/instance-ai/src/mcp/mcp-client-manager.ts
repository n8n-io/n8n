import type { ToolsInput } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import { nanoid } from 'nanoid';

import { sanitizeMcpToolSchemas } from '../agent/sanitize-mcp-schemas';
import type { McpServerConfig } from '../types';

type McpServerEntry =
	| { url: URL }
	| { command: string; args?: string[]; env?: Record<string, string> };

function buildMcpServers(configs: McpServerConfig[]): Record<string, McpServerEntry> {
	const servers: Record<string, McpServerEntry> = {};
	for (const server of configs) {
		if (server.url) {
			servers[server.name] = { url: new URL(server.url) };
		} else if (server.command) {
			servers[server.name] = { command: server.command, args: server.args, env: server.env };
		}
	}
	return servers;
}

/**
 * Owns the lifecycle of MCP client connections used by the orchestrator.
 *
 * Two buckets:
 * - **regular**: external MCP servers configured by the admin. Their tools are
 *   merged into the orchestrator's toolset.
 * - **browser**: Chrome DevTools MCP. Excluded from the orchestrator (context
 *   bloat from screenshots) and only handed to `browser-credential-setup`
 *   sub-agents.
 *
 * Tool listings are cached by config-hash; clients are tracked in a single map
 * so `disconnect()` cleans up everything regardless of which bucket created
 * them.
 */
export class McpClientManager {
	private regularToolsByKey = new Map<string, ToolsInput>();

	private browserToolsByKey = new Map<string, ToolsInput>();

	private clientsByKey = new Map<string, MCPClient>();

	async getRegularTools(configs: McpServerConfig[]): Promise<ToolsInput> {
		if (configs.length === 0) return {};

		const key = JSON.stringify(configs);
		const cached = this.regularToolsByKey.get(key);
		if (cached) return cached;

		const tools = await this.connectAndListTools(`mcp-${nanoid(6)}`, configs, key);
		this.regularToolsByKey.set(key, tools);
		return tools;
	}

	async getBrowserTools(config: McpServerConfig | undefined): Promise<ToolsInput> {
		if (!config) return {};

		const key = JSON.stringify(config);
		const cached = this.browserToolsByKey.get(key);
		if (cached) return cached;

		const tools = await this.connectAndListTools(`browser-mcp-${nanoid(6)}`, [config], key);
		this.browserToolsByKey.set(key, tools);
		return tools;
	}

	async disconnect(): Promise<void> {
		const clients = [...this.clientsByKey.values()];
		this.clientsByKey.clear();
		this.regularToolsByKey.clear();
		this.browserToolsByKey.clear();
		await Promise.all(clients.map(async (c) => await c.disconnect()));
	}

	private async connectAndListTools(
		id: string,
		configs: McpServerConfig[],
		clientKey: string,
	): Promise<ToolsInput> {
		const client = new MCPClient({ id, servers: buildMcpServers(configs) });
		this.clientsByKey.set(clientKey, client);
		return sanitizeMcpToolSchemas(await client.listTools());
	}
}
