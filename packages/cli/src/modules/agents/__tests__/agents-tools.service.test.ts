import { mock } from 'jest-mock-extended';
import type { CredentialProvider } from '@n8n/agents';
import { validateNodeConfig } from '@n8n/workflow-sdk';

import type { EphemeralNodeExecutor } from '@/node-execution';
import type { NodeCatalogService } from '@/node-catalog';

import { AgentsToolsService, isExecutableNodeType } from '../agents-tools.service';

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
	nodeCatalogService.searchNodes.mockResolvedValue('search-result');
	nodeCatalogService.getNodeTypes.mockResolvedValue('node-types-string');

	const ephemeralNodeExecutor = mock<EphemeralNodeExecutor>();

	const service = new AgentsToolsService(nodeCatalogService, ephemeralNodeExecutor);

	return { service, nodeCatalogService, ephemeralNodeExecutor };
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
			const names = service.getSharedTools(makeCredentialProvider()).map((t) => t.name);
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

	describe('search_nodes handler', () => {
		function getSearchTool(service: AgentsToolsService) {
			return service
				.getRuntimeTools(makeCredentialProvider(), 'project-1')
				.find((t) => t.name === 'search_nodes')!;
		}

		it('delegates to the node catalog with the executable-node filter', async () => {
			const { service, nodeCatalogService } = makeService();

			const result = await getSearchTool(service).handler!({ queries: ['gmail'] }, ctx);

			expect(nodeCatalogService.searchNodes).toHaveBeenCalledWith(['gmail'], {
				nodeFilter: isExecutableNodeType,
			});
			expect(result).toEqual({ results: 'search-result' });
		});
	});

	describe('isExecutableNodeType', () => {
		it('rejects trigger and tool-type nodes', () => {
			expect(isExecutableNodeType('n8n-nodes-base.scheduleTrigger')).toBe(false);
			expect(isExecutableNodeType('n8n-nodes-base.httpRequest')).toBe(true);
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

		it('refuses to run trigger and tool-type nodes', async () => {
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

			expect(validateNodeConfig).toHaveBeenCalledWith('n8n-nodes-base.httpRequest', 4, {
				parameters: { url: 'https://example.com' },
			});
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
