import { mock } from 'vitest-mock-extended';

import { ActionLookupInstanceAiToolsService } from '../action-lookup-instance-ai-tools.service';
import type { NodeActionGatewayService } from '../node-action-gateway.service';
import type { VisibleActionCatalogRegistry } from '../visible-action-catalog';

describe('ActionLookupInstanceAiToolsService', () => {
	const gateway = mock<NodeActionGatewayService>();
	const catalogs = mock<VisibleActionCatalogRegistry>();
	const service = new ActionLookupInstanceAiToolsService(gateway, catalogs);
	const originalNodeEnv = process.env.NODE_ENV;
	const originalEnabled = process.env.N8N_NODE_MCP_POC_ENABLED;

	beforeEach(() => {
		process.env.NODE_ENV = 'development';
		process.env.N8N_NODE_MCP_POC_ENABLED = 'true';
		catalogs.get.mockReturnValue({ endpoint: 'action-lookup', actions: [] });
	});

	afterAll(() => {
		process.env.NODE_ENV = originalNodeEnv;
		if (originalEnabled === undefined) delete process.env.N8N_NODE_MCP_POC_ENABLED;
		else process.env.N8N_NODE_MCP_POC_ENABLED = originalEnabled;
	});

	it('builds the action lookup protocol as native tools', async () => {
		gateway.search.mockReturnValue({ actions: [], nextCursor: null });

		const tools = service.createTools(false);

		expect(tools.map((tool) => tool.name)).toEqual([
			'search_node_actions',
			'get_node_action',
			'resolve_node_parameter',
			'run_node_action',
		]);
		await expect(tools[0].handler?.({ query: 'notion', limit: 10 }, {} as never)).resolves.toEqual({
			actions: [],
			nextCursor: null,
		});
		expect(gateway.search.mock.calls).toContainEqual(['action-lookup', 'notion', 10, undefined]);
	});

	it('requires approval for action execution by default', () => {
		const runTool = service.createTools().find((tool) => tool.name === 'run_node_action');

		expect(runTool?.approval).toEqual({ required: true });
	});

	it('does not expose POC tools when the POC is disabled', () => {
		process.env.N8N_NODE_MCP_POC_ENABLED = 'false';

		expect(service.createTools()).toEqual([]);
	});
});
