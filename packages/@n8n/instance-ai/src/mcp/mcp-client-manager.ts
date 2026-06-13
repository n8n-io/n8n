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
import { createToolRegistry, createToolRegistryFromTools } from '../tool-registry';
import type { InstanceAiToolRegistry, McpServerConfig } from '../types';

type McpToolRegistry = InstanceAiToolRegistry;

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
			servers.push({
				name: server.name,
				url: server.url,
				transport: server.transport,
				fetch: server.fetch,
			});
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
	return createToolRegistryFromTools(tools);
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
 * External MCP servers configured by the admin are merged into the
 * orchestrator's toolset. Tool listings are cached by config hash; clients are
 * tracked in one map so `disconnect()` can clean them up.
 */
export class McpClientManager {
	private regularToolsByKey = new Map<string, McpToolRegistry>();

	private inFlightRegularByKey = new Map<string, Promise<McpToolRegistry>>();

	private clientsByKey = new Map<string, McpClient>();

	constructor(private readonly ssrfValidator?: SsrfUrlValidator) {}

	async getRegularTools(configs: McpServerConfig[], logger?: Logger): Promise<McpToolRegistry> {
		const safeConfigs = getSafeMcpServers(configs, logger, 'external MCP');
		if (safeConfigs.length === 0) return createToolRegistry();

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

	async disconnect(): Promise<void> {
		const clients = [...this.clientsByKey.values()];
		this.clientsByKey.clear();
		this.regularToolsByKey.clear();
		this.inFlightRegularByKey.clear();
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

		const safeTools: McpToolRegistry = createToolRegistry();
		addSafeMcpTools(safeTools, sanitizedTools, {
			source,
			claimedToolNames: createClaimedToolNames([]),
			warn: warnSkippedMcpTool(logger),
		});
		return safeTools;
	}
}
