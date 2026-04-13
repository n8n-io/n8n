import { mock } from 'jest-mock-extended';
import type { CredentialProvider } from '@n8n/agents';
import { createCodeBuilderSearchTool } from '@n8n/ai-workflow-builder';
import { validateNodeConfig } from '@n8n/workflow-sdk';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { WorkflowBuilderToolsService } from '@/modules/mcp/tools/workflow-builder/workflow-builder-tools.service';

import { AgentsToolsService } from '../agents-tools.service';

jest.mock('@n8n/ai-workflow-builder', () => ({
	createCodeBuilderSearchTool: jest.fn(),
}));

jest.mock('@n8n/workflow-sdk', () => ({
	validateNodeConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

function makeService() {
	const workflowBuilderToolsService = mock<WorkflowBuilderToolsService>();
	workflowBuilderToolsService.initialize.mockResolvedValue(undefined);
	workflowBuilderToolsService.getNodeTypes.mockResolvedValue('node-types-string');

	const ephemeralNodeExecutor = mock<EphemeralNodeExecutor>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	const service = new AgentsToolsService(
		workflowBuilderToolsService,
		ephemeralNodeExecutor,
		loadNodesAndCredentials,
	);

	return { service, workflowBuilderToolsService, ephemeralNodeExecutor, loadNodesAndCredentials };
}

function makeCredentialProvider(
	creds: Array<{ id: string; name: string; type: string }> = [],
): CredentialProvider {
	const provider = mock<CredentialProvider>();
	provider.list.mockResolvedValue(creds);
	return provider;
}

// ---------------------------------------------------------------------------
// AgentsToolsService
// ---------------------------------------------------------------------------

describe('AgentsToolsService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		const mockInvoke = jest.fn().mockResolvedValue('search-result');
		jest.mocked(createCodeBuilderSearchTool).mockReturnValue({ invoke: mockInvoke } as never);
	});

	// -------------------------------------------------------------------------
	// getSharedTools() / getTools()
	// -------------------------------------------------------------------------

	describe('getSharedTools()', () => {
		it('returns search_nodes, get_node_types, and list_credentials', () => {
			const { service } = makeService();
			const names = service.getSharedTools(makeCredentialProvider()).map((t) => t.name);
			expect(names).toEqual(['search_nodes', 'get_node_types', 'list_credentials']);
		});
	});

	describe('getTools()', () => {
		it('returns all four tools including run_node_tool', () => {
			const { service } = makeService();
			const names = service.getTools(makeCredentialProvider(), 'project-1').map((t) => t.name);
			expect(names).toEqual([
				'search_nodes',
				'get_node_types',
				'list_credentials',
				'run_node_tool',
			]);
		});
	});

	// -------------------------------------------------------------------------
	// search_nodes
	// -------------------------------------------------------------------------

	describe('search_nodes handler', () => {
		function getSearchTool(service: AgentsToolsService) {
			return service
				.getTools(makeCredentialProvider(), 'project-1')
				.find((t) => t.name === 'search_nodes')!;
		}

		it('creates the search tool lazily on first call and returns results', async () => {
			const { service, workflowBuilderToolsService } = makeService();
			const mockParser = {};
			workflowBuilderToolsService.getNodeTypeParser.mockReturnValue(mockParser as never);

			const result = await getSearchTool(service).handler!({ queries: ['gmail'] }, ctx);

			expect(createCodeBuilderSearchTool).toHaveBeenCalledWith(
				mockParser,
				expect.objectContaining({ nodeFilter: expect.any(Function) }),
			);
			expect(result).toEqual({ results: 'search-result' });
		});

		it('passes a nodeFilter that excludes trigger and tool-type nodes', async () => {
			const { service } = makeService();

			await getSearchTool(service).handler!({ queries: ['test'] }, ctx);

			const [, options] = jest.mocked(createCodeBuilderSearchTool).mock.calls[0];
			const { nodeFilter } = options as { nodeFilter: (id: string) => boolean };

			expect(nodeFilter('n8n-nodes-base.scheduleTrigger')).toBe(false);
			expect(nodeFilter('n8n-nodes-base.httpRequest')).toBe(true);
		});

		it('caches results — same query does not reinvoke the search tool', async () => {
			const { service } = makeService();
			const tool = getSearchTool(service);

			await tool.handler!({ queries: ['gmail'] }, ctx);
			await tool.handler!({ queries: ['gmail'] }, ctx);

			const [{ invoke }] = jest
				.mocked(createCodeBuilderSearchTool)
				.mock.results.map((r) => r.value);
			expect(invoke).toHaveBeenCalledTimes(1);
		});

		it('clears the cache when the node-type post-processor fires', async () => {
			const { service, loadNodesAndCredentials } = makeService();
			const tool = getSearchTool(service);

			await tool.handler!({ queries: ['gmail'] }, ctx);

			const [postProcessor] = loadNodesAndCredentials.addPostProcessor.mock.calls[0];
			await postProcessor();

			await tool.handler!({ queries: ['gmail'] }, ctx);

			const [{ invoke }] = jest
				.mocked(createCodeBuilderSearchTool)
				.mock.results.map((r) => r.value);
			expect(invoke).toHaveBeenCalledTimes(2);
		});
	});

	// -------------------------------------------------------------------------
	// run_node_tool
	// -------------------------------------------------------------------------

	describe('run_node_tool handler', () => {
		function getRunTool(service: AgentsToolsService) {
			return service
				.getTools(makeCredentialProvider(), 'project-1')
				.find((t) => t.name === 'run_node_tool')!;
		}

		beforeEach(() => {
			jest.mocked(validateNodeConfig).mockReturnValue({ valid: true, errors: [] });
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
