import { mock } from 'jest-mock-extended';
import type { CredentialProvider } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { validateNodeConfig } from '@n8n/workflow-sdk';

import type { EphemeralNodeExecutor } from '@/node-execution';
import type { NodeCatalogService } from '@/node-catalog';

import {
	AgentsToolsService,
	isAgentToolNodeType,
	isExecutableNodeType,
} from '../agents-tools.service';

jest.mock('@n8n/workflow-sdk', () => ({
	validateNodeConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

function makeService() {
	const nodeCatalogService = mock<NodeCatalogService>();
	nodeCatalogService.searchNodes.mockResolvedValue({
		results: 'search-result',
		queriesWithNoResults: [],
	});
	nodeCatalogService.getNodeTypes.mockResolvedValue('node-types-string');

	const ephemeralNodeExecutor = mock<EphemeralNodeExecutor>();

	const logger = mock<Logger>();

	const service = new AgentsToolsService(logger, nodeCatalogService, ephemeralNodeExecutor);

	return { service, nodeCatalogService, ephemeralNodeExecutor, logger };
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
		jest.clearAllMocks();
	});

	describe('getSharedTools()', () => {
		it('returns search_nodes, get_node_types, and list_credentials', () => {
			const { service } = makeService();
			const names = service.getSharedTools(makeCredentialProvider(), 'hint').map((t) => t.name);
			expect(names).toEqual(['search_nodes', 'get_node_types', 'list_credentials']);
		});
	});

	describe('getRuntimeTools()', () => {
		it('returns all four tools including run_node_tool', () => {
			const { service } = makeService();
			const names = service
				.getRuntimeTools(makeCredentialProvider(), 'project-1')
				.map((t) => t.name);
			expect(names).toEqual([
				'search_nodes',
				'get_node_types',
				'list_credentials',
				'run_node_tool',
			]);
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
				.getRuntimeTools(makeCredentialProvider(), 'project-1')
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
	});

	describe('get_node_types handler', () => {
		function getTypesTool(service: AgentsToolsService) {
			return service
				.getRuntimeTools(makeCredentialProvider(), 'project-1')
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

	describe('run_node_tool handler', () => {
		function getRunTool(service: AgentsToolsService) {
			return service
				.getRuntimeTools(makeCredentialProvider(), 'project-1')
				.find((t) => t.name === 'run_node_tool')!;
		}

		beforeEach(() => {
			jest.mocked(validateNodeConfig).mockReturnValue({ valid: true, errors: [] });
		});

		it('refuses to run trigger nodes', async () => {
			const { service, ephemeralNodeExecutor } = makeService();

			const result = await getRunTool(service).handler!(
				{ nodeType: 'n8n-nodes-base.scheduleTrigger', nodeTypeVersion: 1 },
				ctx,
			);

			expect(ephemeralNodeExecutor.executeInline).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				status: 'error',
				message: expect.stringContaining('scheduleTrigger'),
			});
		});

		it('skips validation and calls executeInline when nodeParameters is absent', async () => {
			const { service, ephemeralNodeExecutor } = makeService();
			ephemeralNodeExecutor.executeInline.mockResolvedValue({ status: 'success' } as never);

			await getRunTool(service).handler!(
				{ nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 4 },
				ctx,
			);

			expect(validateNodeConfig).not.toHaveBeenCalled();
			expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalled();
		});

		it('validates nodeParameters via validateNodeConfig before executing', async () => {
			const { service, ephemeralNodeExecutor } = makeService();
			ephemeralNodeExecutor.executeInline.mockResolvedValue({ status: 'success' } as never);

			await getRunTool(service).handler!(
				{
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeTypeVersion: 4,
					nodeParameters: { url: 'https://example.com' },
				},
				ctx,
			);

			expect(validateNodeConfig).toHaveBeenCalledWith(
				'n8n-nodes-base.httpRequest',
				4,
				{
					parameters: { url: 'https://example.com' },
				},
				{ isToolNode: true },
			);
			expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalled();
		});

		it('returns an error and skips executeInline when validation fails', async () => {
			jest.mocked(validateNodeConfig).mockReturnValue({
				valid: false,
				errors: [{ path: 'method', message: 'Field "method" has invalid value.' }],
			});
			const { service, ephemeralNodeExecutor } = makeService();

			const result = await getRunTool(service).handler!(
				{
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeTypeVersion: 4,
					nodeParameters: { method: 'DELETE' },
				},
				ctx,
			);

			expect(ephemeralNodeExecutor.executeInline).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				status: 'error',
				message: expect.stringContaining('"method"'),
			});
		});

		it('returns a structured error when executeInline throws', async () => {
			const { service, ephemeralNodeExecutor, logger } = makeService();
			ephemeralNodeExecutor.executeInline.mockRejectedValue(new Error('boom'));

			const result = await getRunTool(service).handler!(
				{ nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 4 },
				ctx,
			);

			expect(result).toMatchObject({
				status: 'error',
				message: expect.stringContaining('boom'),
			});
			expect(logger.warn).toHaveBeenCalled();
		});

		it('maps inputData, passes credentials and projectId through to executeInline', async () => {
			const executionResult = { status: 'success', data: [{ json: { ok: true } }] };
			const { service, ephemeralNodeExecutor } = makeService();
			ephemeralNodeExecutor.executeInline.mockResolvedValue(executionResult as never);

			const result = await getRunTool(service).handler!(
				{
					nodeType: 'n8n-nodes-base.gmail',
					nodeTypeVersion: 2,
					credentials: { gmailOAuth2: { id: 'cred-1', name: 'My Gmail' } },
					inputData: { to: 'user@example.com' },
				},
				ctx,
			);

			expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
				expect.objectContaining({
					credentialDetails: { gmailOAuth2: { id: 'cred-1', name: 'My Gmail' } },
					inputData: [{ json: { to: 'user@example.com' } }],
					projectId: 'project-1',
				}),
			);
			expect(result).toEqual(executionResult);
		});
	});
});
