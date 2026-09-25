import type { BuiltTool } from '@n8n/agents';

import { listConnectedMcpServices } from './connected-mcp-services';
import type { InstanceAiToolRegistry, McpServerConfig } from '../types';

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

describe('listConnectedMcpServices', () => {
	it('groups each service with the tools that reached the agent', () => {
		const result = listConnectedMcpServices(
			[serverConfig('mcp_linear', 'linear'), serverConfig('mcp_notion', 'notion')],
			toolsFrom(
				['mcp_linear_create_issue', 'mcp_linear'],
				['mcp_notion_search', 'mcp_notion'],
				['mcp_linear_list_issues', 'mcp_linear'],
			),
		);

		expect(result).toEqual([
			{ slug: 'linear', toolNames: ['mcp_linear_create_issue', 'mcp_linear_list_issues'] },
			{ slug: 'notion', toolNames: ['mcp_notion_search'] },
		]);
	});

	it('reports a service whose tools did not reach the agent', () => {
		const result = listConnectedMcpServices([serverConfig('mcp_linear', 'linear')], toolsFrom());

		expect(result).toEqual([{ slug: 'linear', toolNames: [] }]);
	});

	it('leaves out admin-configured servers, which carry no registry slug', () => {
		const result = listConnectedMcpServices(
			[serverConfig('mcp_linear', 'linear'), { name: 'internal', url: 'https://internal.example' }],
			toolsFrom(['mcp_linear_create_issue', 'mcp_linear'], ['internal_ping', 'internal']),
		);

		expect(result).toEqual([{ slug: 'linear', toolNames: ['mcp_linear_create_issue'] }]);
	});
});
