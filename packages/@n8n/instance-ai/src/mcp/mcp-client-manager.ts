import {
	McpClient,
	type BuiltTool,
	type McpServerConfig as NativeMcpServerConfig,
} from '@n8n/agents';
import type { Result } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import {
	addSafeMcpTools,
	createClaimedToolNames,
	isSafeMcpIdentifierName,
} from '../agent/mcp-tool-name-validation';
import type { McpToolNameValidationError } from '../agent/mcp-tool-name-validation';
import { sanitizeMcpToolSchemas } from '../agent/sanitize-mcp-schemas';
import type { McpSchemaSanitizationError } from '../agent/sanitize-mcp-schemas';
import type { Logger } from '../logger';
import type { McpServerConfig } from '../types';

type McpToolRegistry = Record<string, BuiltTool>;

/**
 * SSRF policy gate for outbound MCP URLs. The cli's `SsrfProtectionService`
 * satisfies this structurally; we keep the local shape narrow to avoid pulling
 * `n8n-core` into this package just for one type.
 */
export interface SsrfUrlValidator {
	validateUrl(url: string | URL): Promise<Result<void, Error>>;
}

function buildNativeMcpConfigs(configs: McpServerConfig[]): NativeMcpServerConfig[] {
	const servers: NativeMcpServerConfig[] = [];
	for (const server of configs) {
		if (server.url) {
			servers.push({ name: server.name, url: server.url });
		} else if (server.command) {
			servers.push({
				name: server.name,
				command: server.command,
				args: server.args,
				env: server.env,
			});
		}
	}
	return servers;
}

function toolsToRegistry(tools: BuiltTool[]): McpToolRegistry {
	return Object.fromEntries(tools.map((tool) => [tool.name, tool]));
}

function warnSkippedMcpSchema(logger: Logger | undefined, source: string) {
	return (error: McpSchemaSanitizationError) => {
		logger?.warn('Skipped MCP tool with unsupported schema', {
			toolName: error.details.toolName,
			source,
			path: error.details.path,
			depth: error.details.depth,
			maxDepth: error.details.maxDepth,
			limitType: error.details.limitType,
			limit: error.details.limit,
			reason: error.message,
		});
	};
}

function warnSkippedMcpTool(logger: Logger | undefined) {
	return (error: McpToolNameValidationError) => {
		logger?.warn('Skipped MCP tool with unsafe name', {
			toolName: error.toolName,
			source: error.source,
			reason: error.message,
		});
	};
}

function getSafeMcpServers(
	configs: McpServerConfig[],
	logger: Logger | undefined,
	source: string,
): McpServerConfig[] {
	return configs.filter((config) => {
		if (isSafeMcpIdentifierName(config.name)) return true;

		logger?.warn('Skipped MCP server with unsafe name', {
			serverName: config.name,
			source,
		});
		return false;
	});
}

/**
 * Owns the lifecycle of MCP client connections used by Instance AI.
 *
 * Two buckets:
 * - regular: external MCP servers configured by the admin. Their tools are
 *   merged into the orchestrator's toolset.
 * - browser: browser MCP. Excluded from the orchestrator and only handed to
 *   browser-oriented sub-agents to keep screenshots/snapshots out of the
 *   orchestrator context.
 *
 * Tool listings are cached by config hash; clients are tracked in one map so
 * `disconnect()` cleans up everything regardless of which bucket created them.
 */
export class McpClientManager {
	private regularToolsByKey = new Map<string, McpToolRegistry>();
	private browserToolsByKey = new Map<string, McpToolRegistry>();

	private inFlightRegularByKey = new Map<string, Promise<McpToolRegistry>>();
	private inFlightBrowserByKey = new Map<string, Promise<McpToolRegistry>>();

	private clientsByKey = new Map<string, McpClient>();

	constructor(private readonly ssrfValidator?: SsrfUrlValidator) {}

	async getRegularTools(configs: McpServerConfig[], logger?: Logger): Promise<McpToolRegistry> {
		const safeConfigs = getSafeMcpServers(configs, logger, 'external MCP');
		if (safeConfigs.length === 0) return {};

		const key = JSON.stringify(safeConfigs);
		return await this.getOrLoad(
			this.regularToolsByKey,
			this.inFlightRegularByKey,
			key,
			async () => {
				await this.validateConfigs(safeConfigs);
				return await this.connectAndListTools(safeConfigs, key, logger, 'external MCP');
			},
		);
	}

	async getBrowserTools(
		config: McpServerConfig | undefined,
		logger?: Logger,
	): Promise<McpToolRegistry> {
		if (!config) return {};

		const [safeConfig] = getSafeMcpServers([config], logger, 'browser MCP');
		if (!safeConfig) return {};

		const key = JSON.stringify(safeConfig);
		return await this.getOrLoad(
			this.browserToolsByKey,
			this.inFlightBrowserByKey,
			key,
			async () => {
				await this.validateConfigs([safeConfig]);
				return await this.connectAndListTools([safeConfig], key, logger, 'browser MCP');
			},
		);
	}

	async disconnect(): Promise<void> {
		const clients = [...this.clientsByKey.values()];
		this.clientsByKey.clear();
		this.regularToolsByKey.clear();
		this.browserToolsByKey.clear();
		this.inFlightRegularByKey.clear();
		this.inFlightBrowserByKey.clear();
		await Promise.all(clients.map(async (client) => await client.close()));
	}

	private async getOrLoad<T>(
		cache: Map<string, T>,
		inFlight: Map<string, Promise<T>>,
		key: string,
		produce: () => Promise<T>,
	): Promise<T> {
		const cached = cache.get(key);
		if (cached !== undefined) return cached;

		const pending = inFlight.get(key);
		if (pending) return await pending;

		const promise = (async () => {
			const value = await produce();
			cache.set(key, value);
			return value;
		})();

		inFlight.set(key, promise);
		try {
			return await promise;
		} finally {
			inFlight.delete(key);
		}
	}

	private async validateConfigs(configs: McpServerConfig[]): Promise<void> {
		for (const server of configs) {
			if (!server.url) continue;

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
						`MCP server "${server.name}": URL blocked by SSRF policy - ${result.error.message}`,
					);
				}
			}
		}
	}

	private async connectAndListTools(
		configs: McpServerConfig[],
		clientKey: string,
		logger: Logger | undefined,
		source: string,
	): Promise<McpToolRegistry> {
		const client = new McpClient(buildNativeMcpConfigs(configs));
		this.clientsByKey.set(clientKey, client);

		const registry = toolsToRegistry(await client.listTools());
		const sanitizedTools = sanitizeMcpToolSchemas(registry, {
			onError: warnSkippedMcpSchema(logger, source),
		});

		const safeTools: McpToolRegistry = {};
		addSafeMcpTools(safeTools, sanitizedTools, {
			source,
			claimedToolNames: createClaimedToolNames([]),
			warn: warnSkippedMcpTool(logger),
		});
		return safeTools;
	}
}
