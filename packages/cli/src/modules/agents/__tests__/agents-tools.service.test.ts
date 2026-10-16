import { mock } from 'vitest-mock-extended';
import { AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES } from '@n8n/api-types';

import type { NodeCatalogService } from '@/node-catalog';

import {
	isAgentToolNodeType,
	isExecutableNodeType,
	AgentsToolsService,
} from '../agents-tools.service';

const ctx = {
	resumeData: undefined,
	suspend: vi.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

function makeService() {
	const nodeCatalogService = mock<NodeCatalogService>();
	nodeCatalogService.searchNodes.mockResolvedValue({
		results: 'search-result',
		queriesWithNoResults: [],
	});
	nodeCatalogService.getNodeTypes.mockResolvedValue('node-types-string');

	const service = new AgentsToolsService(nodeCatalogService);

	return { service, nodeCatalogService };
}

describe('AgentsToolsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSharedTools()', () => {
		it('returns search_nodes and get_node_types', () => {
			const { service } = makeService();
			const names = service.getSharedTools().map((t) => t.name);
			expect(names).toEqual(['search_nodes', 'get_node_types']);
		});
	});

	describe('search_nodes handler', () => {
		function getSearchTool(service: AgentsToolsService) {
			return service.getSharedTools().find((t) => t.name === 'search_nodes')!;
		}

		it('delegates to the node catalog with the agent tool-node filter', async () => {
			const { service, nodeCatalogService } = makeService();

			const result = await getSearchTool(service).handler!({ queries: ['gmail'] }, ctx);

			expect(nodeCatalogService.searchNodes).toHaveBeenCalledWith(['gmail'], {
				nodeFilter: isAgentToolNodeType,
			});
			expect(result).toEqual({ results: 'search-result' });
		});
	});

	describe('searchAgentToolNodes()', () => {
		it('initializes and searches the catalog with the agent tool-node filter', async () => {
			const { service, nodeCatalogService } = makeService();

			const result = await service.searchAgentToolNodes(['gmail', 'slack']);

			expect(nodeCatalogService.initialize).toHaveBeenCalled();
			expect(nodeCatalogService.searchNodes).toHaveBeenCalledWith(['gmail', 'slack'], {
				nodeFilter: isAgentToolNodeType,
			});
			expect(result).toEqual({
				results: 'search-result',
				queriesWithNoResults: [],
			});
		});
	});

	describe('isExecutableNodeType', () => {
		it('rejects trigger nodes only', () => {
			expect(isExecutableNodeType('n8n-nodes-base.scheduleTrigger')).toBe(false);
			expect(isExecutableNodeType('n8n-nodes-base.httpRequest')).toBe(true);
			expect(isExecutableNodeType('n8n-nodes-base.httpRequestTool')).toBe(true);
		});
	});

	describe('isAgentToolNodeType', () => {
		it('allows tool node IDs and rejects base, trigger, or HITL tool node IDs', () => {
			expect(isAgentToolNodeType('n8n-nodes-base.scheduleTrigger')).toBe(false);
			expect(isAgentToolNodeType('n8n-nodes-base.httpRequest')).toBe(false);
			expect(isAgentToolNodeType('n8n-nodes-base.httpRequestTool')).toBe(true);
			expect(isAgentToolNodeType('n8n-nodes-base.slackHitlTool')).toBe(false);
		});

		it('rejects non-provider langchain nodes that are not tool types', () => {
			// Non-provider langchain nodes stay excluded.
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(false);
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.agent')).toBe(false);
		});

		it('rejects hidden agent-builder tool node IDs', () => {
			for (const nodeType of AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES) {
				expect(isAgentToolNodeType(nodeType)).toBe(false);
			}
		});

		it('does not allow MCP tool nodes', () => {
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.mcpClientTool')).toBe(false);
			expect(isAgentToolNodeType('@n8n/mcp-registry.notion')).toBe(false);
		});
	});

	describe('get_node_types handler', () => {
		function getTypesTool(service: AgentsToolsService) {
			return service.getSharedTools().find((t) => t.name === 'get_node_types')!;
		}

		it('forwards string node IDs unchanged', async () => {
			const { service, nodeCatalogService } = makeService();

			await getTypesTool(service).handler!({ nodeIds: ['n8n-nodes-base.gmail'] }, ctx);

			expect(nodeCatalogService.getNodeTypes).toHaveBeenCalledWith(['n8n-nodes-base.gmail']);
		});

		it('stringifies object-style version before passing to the catalog', async () => {
			const { service, nodeCatalogService } = makeService();

			await getTypesTool(service).handler!(
				{ nodeIds: [{ nodeId: 'n8n-nodes-base.gmail', version: 2.1, resource: 'message' }] },
				ctx,
			);

			expect(nodeCatalogService.getNodeTypes).toHaveBeenCalledWith([
				{ nodeId: 'n8n-nodes-base.gmail', version: '2.1', resource: 'message' },
			]);
		});

		it.each(['sendAndWait', 'dispatchAndWait'])(
			'rejects unsupported operation %s before reading its node schema',
			async (operation) => {
				const { service, nodeCatalogService } = makeService();

				const result = await getTypesTool(service).handler!(
					{
						nodeIds: [
							{
								nodeId: 'n8n-nodes-base.slackTool',
								version: 2.2,
								resource: 'message',
								operation,
							},
						],
					},
					ctx,
				);

				expect(nodeCatalogService.getNodeTypes).not.toHaveBeenCalled();
				expect(result).toEqual({
					results: expect.stringContaining(`Operation "${operation}"`),
				});
				expect(result).toEqual({
					results: expect.stringContaining('requireApproval: true'),
				});
			},
		);
	});
});
