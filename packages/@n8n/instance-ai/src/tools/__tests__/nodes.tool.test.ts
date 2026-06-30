import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { createNodesTool } from '../nodes.tool';

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: vi.fn(),
			get: vi.fn(),
			getAsWorkflowJSON: vi.fn(),
			createFromWorkflowJSON: vi.fn(),
			updateFromWorkflowJSON: vi.fn(),
			archive: vi.fn(),
			delete: vi.fn(),
			publish: vi.fn(),
			unpublish: vi.fn(),
		},
		executionService: {
			list: vi.fn(),
			run: vi.fn(),
			getStatus: vi.fn(),
			getResult: vi.fn(),
			stop: vi.fn(),
			getDebugInfo: vi.fn(),
			getNodeOutput: vi.fn(),
		},
		credentialService: {
			list: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
		},
		nodeService: {
			listAvailable: vi.fn(),
			getDescription: vi.fn(),
			listSearchable: vi.fn(),
			exploreResources: vi.fn(),
		},
		dataTableService: {
			list: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			getSchema: vi.fn(),
			addColumn: vi.fn(),
			deleteColumn: vi.fn(),
			renameColumn: vi.fn(),
			queryRows: vi.fn(),
			insertRows: vi.fn(),
			updateRows: vi.fn(),
			deleteRows: vi.fn(),
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
			(context.nodeService.exploreResources as Mock).mockResolvedValue(mockResult);

			const tool = createNodesTool(context, 'orchestrator');
			const result = await executeTool(
				tool,
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
			expect(tool.description).not.toContain('targeted guides');
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
			(context.nodeService.listAvailable as Mock).mockResolvedValue(nodes);

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'list', query: 'http' } as never,
				{} as never,
			);

			expect(context.nodeService.listAvailable).toHaveBeenCalledWith({ query: 'http' });
			expect(result).toEqual({ nodes });
		});
	});

	describe('search action', () => {
		it('should search nodes by query and reuse the searchable node list reference', async () => {
			const searchableNodes = [
				{
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Make HTTP requests',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					codex: { alias: ['api'] },
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);

			const tool = createNodesTool(context, 'full');
			const first = await executeTool(
				tool,
				{ action: 'search', query: 'http', limit: 5 } as never,
				{} as never,
			);
			const second = await executeTool(
				tool,
				{ action: 'search', query: 'http', limit: 5 } as never,
				{} as never,
			);

			expect(context.nodeService.listSearchable).toHaveBeenCalledTimes(2);
			expect(first).toMatchObject({
				totalResults: 1,
				results: [expect.objectContaining({ name: 'n8n-nodes-base.httpRequest' })],
			});
			expect(second).toMatchObject({
				totalResults: 1,
				results: [expect.objectContaining({ name: 'n8n-nodes-base.httpRequest' })],
			});
		});

		it('should search nodes by connection type and enrich results with discriminators', async () => {
			const searchableNodes = [
				{
					name: 'n8n-nodes-base.slackTool',
					displayName: 'Slack Tool',
					description: 'Send messages to Slack from an AI agent',
					inputs: ['main'],
					outputs: ['ai_tool'],
					version: 1,
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			context.nodeService.listDiscriminators = vi.fn().mockResolvedValue({
				resource: ['message'],
			});

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'search', connectionType: 'ai_tool', limit: 5 } as never,
				{} as never,
			);

			expect(context.nodeService.listDiscriminators).toHaveBeenCalledWith(
				'n8n-nodes-base.slackTool',
			);
			expect(result).toMatchObject({
				totalResults: 1,
				results: [
					expect.objectContaining({
						name: 'n8n-nodes-base.slackTool',
						discriminators: { resource: ['message'] },
					}),
				],
			});
		});

		it("suggests the chat model for the user's configured provider on ai_languageModel requirements", async () => {
			const searchableNodes = [
				{
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'Reasoning agent',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					builderHint: { inputs: { ai_languageModel: { required: true } } },
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			(context.credentialService.list as Mock).mockResolvedValue([
				{ id: 'cred-1', name: 'My Anthropic key', type: 'anthropicApi' },
			]);

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'search', query: 'agent', limit: 5 } as never,
				{} as never,
			);

			expect(result).toMatchObject({
				results: [
					expect.objectContaining({
						subnodeRequirements: [
							expect.objectContaining({
								connectionType: 'ai_languageModel',
								suggestedNode: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
							}),
						],
					}),
				],
			});
		});

		it('does not suggest a chat model when no LLM credential is configured', async () => {
			const searchableNodes = [
				{
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'Reasoning agent',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					builderHint: { inputs: { ai_languageModel: { required: true } } },
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'search', query: 'agent', limit: 5 } as never,
				{} as never,
			);

			const [node] = (result as { results: Array<{ subnodeRequirements?: unknown[] }> }).results;
			expect(node.subnodeRequirements).toEqual([
				expect.not.objectContaining({ suggestedNode: expect.anything() }),
			]);
		});

		it('should return no search results when neither query nor connection type is provided', async () => {
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue([]);

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(tool, { action: 'search' } as never, {} as never);

			expect(result).toEqual({ results: [], totalResults: 0 });
		});
	});

	describe('explore-resources action', () => {
		it('should return error when exploreResources is not available', async () => {
			const context = createMockContext();
			context.nodeService.exploreResources = undefined;

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
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
			(context.nodeService.exploreResources as Mock).mockRejectedValue(new Error('Auth failed'));

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
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

			const result = await executeTool(tool, { action: 'type-definition' } as never, {} as never);

			expect(result).toMatchObject({
				definitions: [],
				error: expect.stringContaining('nodeTypes'),
			});
		});

		it('should return a Zod-derived error when nodeTypes is empty', async () => {
			const context = createMockContext();
			const tool = createNodesTool(context, 'full');

			const result = await executeTool(
				tool,
				{ action: 'type-definition', nodeTypes: [] } as never,
				{} as never,
			);

			expect(result).toMatchObject({
				definitions: [],
				error: expect.stringContaining('nodeTypes'),
			});
		});

		it('should surface node-level builder hints from type definitions', async () => {
			const context = createMockContext({
				nodeService: {
					listAvailable: vi.fn(),
					getDescription: vi.fn(),
					listSearchable: vi.fn(),
					exploreResources: vi.fn(),
					getNodeTypeDefinition: vi.fn().mockResolvedValue({
						content: 'export type IfNode = unknown;',
						version: 'v23',
						builderHint: 'Always include options, conditions, and combinator.',
					}),
				},
			});

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'type-definition', nodeTypes: ['n8n-nodes-base.if'] } as never,
				{} as never,
			);

			expect(result).toEqual({
				definitions: [
					{
						nodeType: 'n8n-nodes-base.if',
						version: 'v23',
						content: 'export type IfNode = unknown;',
						builderHint: 'Always include options, conditions, and combinator.',
					},
				],
			});
		});
	});

	describe('describe action', () => {
		it('should return found: false when node type is not found', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as Mock).mockRejectedValue(new Error('not found'));

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
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
