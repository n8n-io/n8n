import type { BuiltTool } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { loadConnectedMcpServices, reconcileConnectedMcpServices } from './connected-mcp-services';
import type { Logger } from '../logger';
import type { InstanceAiMcpService, InstanceAiToolRegistry, McpServerConfig } from '../types';

function serverConfig(name: string, serverSlug: string): McpServerConfig {
	return { name, url: `https://${serverSlug}.example`, metadata: { serverSlug } };
}

function toolsFrom(...entries: Array<[toolName: string, mcpServerName: string]>) {
	const registry: InstanceAiToolRegistry = new Map();
	for (const [toolName, mcpServerName] of entries) {
		registry.set(toolName, {
			name: toolName,
			description: '',
			handler: vi.fn(),
			mcpTool: true,
			mcpServerName,
		} as unknown as BuiltTool);
	}
	return registry;
}

const logger = mock<Logger>();

describe('reconcileConnectedMcpServices', () => {
	it('marks a connection whose tools reached the agent as loaded', () => {
		const result = reconcileConnectedMcpServices(
			[{ slug: 'linear', title: 'Linear' }],
			[serverConfig('mcp_linear', 'linear')],
			toolsFrom(['mcp_linear_create_issue', 'mcp_linear']),
		);

		expect(result).toEqual([{ slug: 'linear', title: 'Linear', toolsLoaded: true }]);
	});

	it('marks a connection that never became a server config as not loaded', () => {
		const result = reconcileConnectedMcpServices(
			[{ slug: 'linear', title: 'Linear' }],
			[],
			toolsFrom(),
		);

		expect(result).toEqual([{ slug: 'linear', title: 'Linear', toolsLoaded: false }]);
	});

	// A reachable server that lists nothing — an under-scoped credential, or a tool
	// filter that excludes everything — leaves the agent just as toolless.
	it('marks a connected server that contributed no tools as not loaded', () => {
		const result = reconcileConnectedMcpServices(
			[{ slug: 'linear', title: 'Linear' }],
			[serverConfig('mcp_linear', 'linear')],
			toolsFrom(['mcp_notion_search', 'mcp_notion']),
		);

		expect(result).toEqual([{ slug: 'linear', title: 'Linear', toolsLoaded: false }]);
	});

	it('reports each connection separately', () => {
		const result = reconcileConnectedMcpServices(
			[
				{ slug: 'linear', title: 'Linear' },
				{ slug: 'notion', title: 'Notion' },
			],
			[serverConfig('mcp_linear', 'linear'), serverConfig('mcp_notion', 'notion')],
			toolsFrom(['mcp_notion_search', 'mcp_notion']),
		);

		expect(result).toEqual([
			{ slug: 'linear', title: 'Linear', toolsLoaded: false },
			{ slug: 'notion', title: 'Notion', toolsLoaded: true },
		]);
	});

	it('ignores tools from servers outside the registry, such as admin-configured ones', () => {
		const result = reconcileConnectedMcpServices(
			[{ slug: 'linear', title: 'Linear' }],
			[{ name: 'internal', url: 'https://internal.example' }],
			toolsFrom(['internal_ping', 'internal']),
		);

		expect(result).toEqual([{ slug: 'linear', title: 'Linear', toolsLoaded: false }]);
	});
});

describe('loadConnectedMcpServices', () => {
	it('returns nothing when the host wired no MCP service', async () => {
		expect(await loadConnectedMcpServices(undefined, [], toolsFrom(), logger)).toBeUndefined();
	});

	it('returns an empty list when the user has no connections', async () => {
		const mcpService = mock<InstanceAiMcpService>({
			listConnections: vi.fn().mockResolvedValue([]),
		});

		expect(await loadConnectedMcpServices(mcpService, [], toolsFrom(), logger)).toEqual([]);
	});

	// `[]` would read as "nothing is connected" and let the agent claim a connected
	// service was never connected.
	it('returns nothing rather than an empty list when the lookup fails', async () => {
		const mcpService = mock<InstanceAiMcpService>({
			listConnections: vi.fn().mockRejectedValue(new Error('registry unavailable')),
		});

		expect(await loadConnectedMcpServices(mcpService, [], toolsFrom(), logger)).toBeUndefined();
		expect(logger.warn).toHaveBeenCalled();
	});
});
