import type { ToolsInput } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import type { Result } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { sanitizeMcpToolSchemas } from '../agent/sanitize-mcp-schemas';
import type { McpServerConfig } from '../types';

/**
 * SSRF policy gate for outbound MCP URLs. The cli's `SsrfProtectionService`
 * satisfies this structurally; we keep the local shape narrow to avoid pulling
 * `n8n-core` into this package just for one type.
 */
export interface SsrfUrlValidator {
	validateUrl(url: string | URL): Promise<Result<void, Error>>;
}

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
 *
 * URLs are validated before the underlying `MCPClient` is constructed:
 * - Protocol whitelist (`http:` / `https:`) is always enforced.
 * - SSRF policy is opt-in via `ssrfValidator`. The cli supplies one when
 *   `N8N_SSRF_PROTECTION_ENABLED` is on, matching how other admin-configured
 *   outbound URLs (workflow imports, HTTP Request node) handle the same flag.
 */
export class McpClientManager {
	private regularToolsByKey = new Map<string, ToolsInput>();

	private browserToolsByKey = new Map<string, ToolsInput>();

	private clientsByKey = new Map<string, MCPClient>();

	constructor(private readonly ssrfValidator?: SsrfUrlValidator) {}

	async getRegularTools(configs: McpServerConfig[]): Promise<ToolsInput> {
		if (configs.length === 0) return {};

		const key = JSON.stringify(configs);
		const cached = this.regularToolsByKey.get(key);
		if (cached) return cached;

		await this.validateConfigs(configs);
		const tools = await this.connectAndListTools(`mcp-${nanoid(6)}`, configs, key);
		this.regularToolsByKey.set(key, tools);
		return tools;
	}

	async getBrowserTools(config: McpServerConfig | undefined): Promise<ToolsInput> {
		if (!config) return {};

		const key = JSON.stringify(config);
		const cached = this.browserToolsByKey.get(key);
		if (cached) return cached;

		await this.validateConfigs([config]);
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

	private async validateConfigs(configs: McpServerConfig[]): Promise<void> {
		for (const server of configs) {
			if (!server.url) continue; // stdio transport — no URL to validate

			let parsed: URL;
			try {
				parsed = new URL(server.url);
			} catch {
				throw new UserError(`MCP server "${server.name}": invalid URL "${server.url}"`);
			}

			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				throw new UserError(
					`MCP server "${server.name}": only http(s) URLs are allowed, got "${parsed.protocol}"`,
				);
			}

			if (this.ssrfValidator) {
				const result = await this.ssrfValidator.validateUrl(server.url);
				if (!result.ok) {
					throw new UserError(
						`MCP server "${server.name}": URL blocked by SSRF policy — ${result.error.message}`,
					);
				}
			}
		}
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
