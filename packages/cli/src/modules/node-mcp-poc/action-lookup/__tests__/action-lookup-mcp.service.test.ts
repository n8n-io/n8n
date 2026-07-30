import { mock } from 'vitest-mock-extended';

import type { NodeActionGatewayService } from '../node-action-gateway.service';
import { ActionLookupMcpService } from '../action-lookup-mcp.service';

const registeredTools = vi.hoisted(
	() => new Map<string, (...argumentsValue: unknown[]) => unknown>(),
);
const registeredDescriptions = vi.hoisted(() => new Map<string, string>());

vi.mock('@n8n/utils/lazy-import', () => ({
	lazyImport: async (loader: () => Promise<unknown>) => await loader(),
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
	McpServer: class {
		registerTool(
			name: string,
			config: { description?: string },
			callback: (...argumentsValue: unknown[]) => unknown,
		) {
			registeredTools.set(name, callback);
			if (config.description) registeredDescriptions.set(name, config.description);
		}
	},
}));

describe('ActionLookupMcpService', () => {
	const gateway = mock<NodeActionGatewayService>();
	const service = new ActionLookupMcpService(gateway);

	beforeEach(() => {
		registeredTools.clear();
		registeredDescriptions.clear();
		gateway.getCatalog.mockReturnValue({ endpoint: 'actions', actions: [] });
	});

	it('registers the fixed four-tool protocol once', async () => {
		await service.getServer('actions');

		expect([...registeredTools.keys()]).toEqual([
			'search_node_actions',
			'get_node_action',
			'resolve_node_parameter',
			'run_node_action',
		]);
	});

	it('steers the model through discovery, inspection, resolution, and execution', async () => {
		await service.getServer('actions');

		expect(registeredDescriptions.get('search_node_actions')).toContain('Never guess an actionId');
		expect(registeredDescriptions.get('get_node_action')).toContain(
			'Use only fields listed in input.fields',
		);
		expect(registeredDescriptions.get('resolve_node_parameter')).toContain(
			'Never silently select an option',
		);
		expect(registeredDescriptions.get('run_node_action')).toContain(
			'Fields with acceptsExpression support n8n expressions',
		);
	});

	it('returns object results only as structured content', async () => {
		gateway.search.mockReturnValue({ actions: [], nextCursor: null });
		await service.getServer('actions');

		const search = registeredTools.get('search_node_actions');
		expect(search).toBeDefined();
		await expect(search?.({ query: 'sheets', limit: 10 })).resolves.toEqual({
			content: [],
			structuredContent: { actions: [], nextCursor: null },
		});
	});
});
