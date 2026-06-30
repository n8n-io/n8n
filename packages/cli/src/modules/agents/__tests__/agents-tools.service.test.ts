import { mock } from 'vitest-mock-extended';
import type { CredentialProvider } from '@n8n/agents';
import {
	AGENT_BUILDER_AVAILABLE_AI_UTILITY_TOOL_NODE_TYPES,
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
} from '@n8n/api-types';

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

function makeCredentialProvider(
	creds: Array<{ id: string; name: string; type: string }> = [],
): CredentialProvider {
	const provider = mock<CredentialProvider>();
	provider.list.mockResolvedValue(creds);
	return provider;
}

describe('AgentsToolsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSharedTools()', () => {
		it('returns search_nodes, get_node_types, and list_credentials', () => {
			const { service } = makeService();
			const names = service.getSharedTools(makeCredentialProvider(), 'hint').map((t) => t.name);
			expect(names).toEqual(['search_nodes', 'get_node_types', 'list_credentials']);
		});
	});

	describe('list_credentials handler', () => {
		function getListTool(service: AgentsToolsService, provider: CredentialProvider) {
			return service.getSharedTools(provider, 'hint').find((t) => t.name === 'list_credentials')!;
		}

		it('returns all credentials when no types filter is provided', async () => {
			const { service } = makeService();
			const provider = makeCredentialProvider([
				{ id: '1', name: 'Gmail', type: 'gmailOAuth2' },
				{ id: '2', name: 'Header', type: 'httpHeaderAuth' },
			]);

			const result = await getListTool(service, provider).handler!({}, ctx);

			expect(result).toEqual({
				credentials: [
					{ id: '1', name: 'Gmail', type: 'gmailOAuth2' },
					{ id: '2', name: 'Header', type: 'httpHeaderAuth' },
				],
			});
		});

		it('filters by the provided credential types', async () => {
			const { service } = makeService();
			const provider = makeCredentialProvider([
				{ id: '1', name: 'Gmail', type: 'gmailOAuth2' },
				{ id: '2', name: 'Header', type: 'httpHeaderAuth' },
				{ id: '3', name: 'Slack', type: 'slackApi' },
			]);

			const result = await getListTool(service, provider).handler!(
				{ types: ['gmailOAuth2', 'slackApi'] },
				ctx,
			);

			expect(result).toEqual({
				credentials: [
					{ id: '1', name: 'Gmail', type: 'gmailOAuth2' },
					{ id: '3', name: 'Slack', type: 'slackApi' },
				],
			});
		});

		it('returns all credentials when types is an empty array', async () => {
			const { service } = makeService();
			const provider = makeCredentialProvider([{ id: '1', name: 'Gmail', type: 'gmailOAuth2' }]);

			const result = await getListTool(service, provider).handler!({ types: [] }, ctx);

			expect(result).toEqual({
				credentials: [{ id: '1', name: 'Gmail', type: 'gmailOAuth2' }],
			});
		});
	});

	describe('search_nodes handler', () => {
		function getSearchTool(service: AgentsToolsService) {
			return service
				.getSharedTools(makeCredentialProvider(), 'hint')
				.find((t) => t.name === 'search_nodes')!;
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

		it('admits whitelisted AI provider nodes (full vendor APIs)', () => {
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.openAi')).toBe(true);
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.anthropic')).toBe(true);
			// Non-provider langchain nodes stay excluded.
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(false);
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.agent')).toBe(false);
		});

		it('rejects hidden agent-builder tool node IDs', () => {
			for (const nodeType of AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES) {
				expect(isAgentToolNodeType(nodeType)).toBe(false);
			}
		});

		it('allows shared AI utility tool node IDs', () => {
			for (const nodeType of AGENT_BUILDER_AVAILABLE_AI_UTILITY_TOOL_NODE_TYPES) {
				expect(isAgentToolNodeType(nodeType)).toBe(true);
			}
		});

		it('does not allow MCP tool nodes', () => {
			expect(isAgentToolNodeType('@n8n/n8n-nodes-langchain.mcpClientTool')).toBe(false);
			expect(isAgentToolNodeType('@n8n/mcp-registry.notion')).toBe(false);
		});
	});

	describe('get_node_types handler', () => {
		function getTypesTool(service: AgentsToolsService) {
			return service
				.getSharedTools(makeCredentialProvider(), 'hint')
				.find((t) => t.name === 'get_node_types')!;
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
	});
});
