import type { InstanceAiContext } from '../../types';
import { createNodesTool } from '../nodes.tool';

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
			exploreResources: jest.fn(),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('nodes tool', () => {
	describe('orchestrator surface', () => {
		it('should only expose explore-resources action', () => {
			const context = createMockContext();
			const tool = createNodesTool(context, 'orchestrator');

			expect(tool.description).toContain('RLC parameters');
			expect(tool.description).not.toContain('list —');
			expect(tool.description).not.toContain('search —');
		});

		it('should call exploreResources for explore-resources action', async () => {
			const context = createMockContext();
			const mockResult = {
				results: [{ name: 'Sheet1', value: 'sheet-1' }],
				paginationToken: undefined,
			};
			(context.nodeService.exploreResources as jest.Mock).mockResolvedValue(mockResult);

			const tool = createNodesTool(context, 'orchestrator');
			const result = await tool.execute!(
				{
					action: 'explore-resources',
					nodeType: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					methodName: 'spreadSheetsSearch',
					methodType: 'listSearch',
					credentialType: 'googleSheetsOAuth2Api',
					credentialId: 'cred1',
				},
				{} as never,
			);

			expect(context.nodeService.exploreResources).toHaveBeenCalled();
			expect(result).toEqual({
				results: [{ name: 'Sheet1', value: 'sheet-1' }],
				paginationToken: undefined,
			});
		});
	});

	describe('full surface', () => {
		it('should have a concise description', () => {
			const context = createMockContext();
			const tool = createNodesTool(context, 'full');

			expect(tool.description).toContain('node types');
		});
	});

	describe('list action', () => {
		it('should call nodeService.listAvailable with query', async () => {
			const nodes = [
				{
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Make HTTP requests',
					group: ['transform'],
					version: 1,
				},
			];
			const context = createMockContext();
			(context.nodeService.listAvailable as jest.Mock).mockResolvedValue(nodes);

			const tool = createNodesTool(context, 'full');
			const result = await tool.execute!({ action: 'list', query: 'http' } as never, {} as never);

			expect(context.nodeService.listAvailable).toHaveBeenCalledWith({ query: 'http' });
			expect(result).toEqual({ nodes });
		});
	});

	describe('explore-resources action', () => {
		it('should return error when exploreResources is not available', async () => {
			const context = createMockContext();
			context.nodeService.exploreResources = undefined;

			const tool = createNodesTool(context, 'full');
			const result = await tool.execute!(
				{
					action: 'explore-resources',
					nodeType: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					methodName: 'spreadSheetsSearch',
					methodType: 'listSearch' as const,
					credentialType: 'googleSheetsOAuth2Api',
					credentialId: 'cred1',
				},
				{} as never,
			);

			expect(result).toEqual({
				results: [],
				error: 'Resource exploration is not available.',
			});
		});

		it('should handle errors from exploreResources gracefully', async () => {
			const context = createMockContext();
			(context.nodeService.exploreResources as jest.Mock).mockRejectedValue(
				new Error('Auth failed'),
			);

			const tool = createNodesTool(context, 'full');
			const result = await tool.execute!(
				{
					action: 'explore-resources',
					nodeType: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					methodName: 'spreadSheetsSearch',
					methodType: 'listSearch' as const,
					credentialType: 'googleSheetsOAuth2Api',
					credentialId: 'cred1',
				},
				{} as never,
			);

			expect(result).toEqual({
				results: [],
				error: 'Auth failed',
			});
		});
	});

	describe('type-definition action', () => {
		it('should return a Zod-derived error when nodeTypes is missing', async () => {
			// The discriminated union is flattened for Anthropic, so `nodeTypes`
			// becomes optional at the top-level schema. The handler re-validates
			// against the variant schema so missing fields return a structured
			// error instead of crashing downstream on input.nodeTypes.map.
			const context = createMockContext();
			const tool = createNodesTool(context, 'full');

			const result = await tool.execute!({ action: 'type-definition' } as never, {} as never);

			expect(result).toMatchObject({
				definitions: [],
				error: expect.stringContaining('nodeTypes'),
			});
		});

		it('should return a Zod-derived error when nodeTypes is empty', async () => {
			const context = createMockContext();
			const tool = createNodesTool(context, 'full');

			const result = await tool.execute!(
				{ action: 'type-definition', nodeTypes: [] } as never,
				{} as never,
			);

			expect(result).toMatchObject({
				definitions: [],
				error: expect.stringContaining('nodeTypes'),
			});
		});
	});

	describe('describe action', () => {
		it('should return found: false when node type is not found', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockRejectedValue(new Error('not found'));

			const tool = createNodesTool(context, 'full');
			const result = await tool.execute!(
				{ action: 'describe', nodeType: 'unknown.node' } as never,
				{} as never,
			);

			expect(result).toMatchObject({
				found: false,
				error: expect.stringContaining('unknown.node'),
			});
		});
	});
});
