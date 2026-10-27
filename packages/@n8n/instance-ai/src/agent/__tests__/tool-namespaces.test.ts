import type { BuiltTool } from '@n8n/agents';

import { mcpNamespaceName, splitToolNamespaces } from '../tool-namespaces';

function tool(name: string, mcpServerName?: string): BuiltTool {
	return { name, description: name, mcpServerName } as BuiltTool;
}

function registry(...tools: BuiltTool[]) {
	return new Map(tools.map((t) => [t.name, t]));
}

describe('splitToolNamespaces', () => {
	it('keeps unlisted product tools attached and namespaces the listed ones', () => {
		const result = splitToolNamespaces({
			tools: registry(
				tool('list_workflows'),
				tool('ask_user'),
				tool('skills'),
				tool('data_tables'),
				tool('research'),
				tool('n8n-docs'),
			),
			mcpToolNames: new Set(),
			localMcpToolNames: new Set(),
		});

		expect(result.attachedTools.map((t) => t.name)).toEqual([
			'list_workflows',
			'ask_user',
			'skills',
		]);
		expect(result.namespaces.map((ns) => [ns.name, ns.tools.map((t) => t.name)])).toEqual([
			['data_tables', ['data_tables']],
			['research', ['research', 'n8n-docs']],
		]);
	});

	it('groups external MCP tools by server and local MCP tools under browser', () => {
		const result = splitToolNamespaces({
			tools: registry(
				tool('linear_list_issues', 'Linear'),
				tool('notion_search', 'Notion'),
				tool('linear_get_issue', 'Linear'),
				tool('browser_navigate'),
			),
			mcpToolNames: new Set(['linear_list_issues', 'notion_search', 'linear_get_issue']),
			localMcpToolNames: new Set(['browser_navigate']),
		});

		expect(result.attachedTools).toEqual([]);
		expect(result.namespaces.map((ns) => [ns.name, ns.tools.map((t) => t.name)])).toEqual([
			['browser', ['browser_navigate']],
			['mcp_linear', ['linear_list_issues', 'linear_get_issue']],
			['mcp_notion', ['notion_search']],
		]);
	});

	it('leaves empty namespaces out', () => {
		const result = splitToolNamespaces({
			tools: registry(tool('list_workflows')),
			mcpToolNames: new Set(),
			localMcpToolNames: new Set(),
		});

		expect(result.namespaces).toEqual([]);
	});
});

describe('mcpNamespaceName', () => {
	it('builds a stable slug', () => {
		expect(mcpNamespaceName('My Server (prod)')).toBe('mcp_my_server_prod');
		expect(mcpNamespaceName('***')).toBe('mcp_server');
	});
});
