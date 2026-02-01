import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import {
	nodeTypes,
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	createToolConfig,
	expectToolSuccess,
	buildNodeSearchQuery,
	type ParsedToolContent,
	createNodeType,
} from '../../../test/test-utils';
import { createNodeSearchTool } from '../node-search.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('NodeSearchTool', () => {
	let nodeTypesList: INodeTypeDescription[];
	let nodeSearchTool: ReturnType<typeof createNodeSearchTool>['tool'];

	beforeEach(() => {
		jest.clearAllMocks();

		// Create a comprehensive test node set
		nodeTypesList = [
			nodeTypes.code,
			nodeTypes.httpRequest,
			createNodeType({
				...nodeTypes.webhook,
				description: 'Starts workflow on webhook call',
			}),
			nodeTypes.setNode,
			nodeTypes.ifNode,
			nodeTypes.mergeNode,
			// AI nodes
			nodeTypes.openAiModel,
			nodeTypes.agent,
			createNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCalculator',
				displayName: 'Calculator Tool',
				description: 'Perform mathematical calculations',
				inputs: [],
				outputs: ['ai_tool'],
			}),
			createNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCode',
				displayName: 'Code Tool',
				description: 'Execute custom code as a tool',
				inputs: [],
				outputs: ['ai_tool'],
			}),
			createNodeType({
				name: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				displayName: 'Window Buffer Memory',
				description: 'Stores conversation in a sliding window',
				inputs: [],
				outputs: ['ai_memory'],
			}),
			createNodeType({
				name: 'n8n-nodes-base.httpBin',
				displayName: 'HTTP Bin',
				description: 'Test HTTP requests',
				codex: {
					alias: ['httpbinero', 'request test'],
				},
			}),
			// Expression-based node
			nodeTypes.vectorStoreNode,
		];
		nodeSearchTool = createNodeSearchTool(nodeTypesList).tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should search nodes by name', async () => {
			const mockConfig = createToolConfigWithWriter('search_nodes', 'test-call-1');

			const result = await nodeSearchTool.invoke(
				{
					queries: [buildNodeSearchQuery('name', 'http')],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found');
			expect(message).toContain('nodes matching "http"');
			expect(message).toContain('<node_name>n8n-nodes-base.httpRequest</node_name>');
			expect(message).toContain('<node_name>n8n-nodes-base.httpBin</node_name>');

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should search sub-nodes by connection type', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-2');

			const result = await nodeSearchTool.invoke(
				{
					queries: [buildNodeSearchQuery('subNodeSearch', undefined, NodeConnectionTypes.AiTool)],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found');
			expect(message).toContain('nodes matching "sub-nodes with ai_tool output"');
			expect(message).toContain('<node_name>@n8n/n8n-nodes-langchain.toolCalculator</node_name>');
			expect(message).toContain('<node_name>@n8n/n8n-nodes-langchain.toolCode</node_name>');
			expect(message).toContain('<node_outputs>["ai_tool"]</node_outputs>');
		});

		it('should search sub-nodes with name filter', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-3');

			const result = await nodeSearchTool.invoke(
				{
					queries: [
						buildNodeSearchQuery('subNodeSearch', 'calculator', NodeConnectionTypes.AiTool),
					],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found');
			expect(message).toContain(
				'nodes matching "sub-nodes with ai_tool output matching "calculator""',
			);
			expect(message).toContain('<node_name>@n8n/n8n-nodes-langchain.toolCalculator</node_name>');
			expect(message).not.toContain('<node_name>@n8n/n8n-nodes-langchain.toolCode</node_name>');
		});

		it('should handle multiple queries in a single request', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-4');

			const result = await nodeSearchTool.invoke(
				{
					queries: [
						buildNodeSearchQuery('name', 'code'),
						buildNodeSearchQuery('subNodeSearch', undefined, NodeConnectionTypes.AiLanguageModel),
					],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found');
			// First query results
			expect(message).toContain('nodes matching "code"');
			expect(message).toContain('Code');

			// Second query results
			expect(message).toContain('nodes matching "sub-nodes with ai_languageModel output"');
			expect(message).toContain('<node_name>@n8n/n8n-nodes-langchain.lmChatOpenAi</node_name>');
		});

		it('should return no results message for non-matching queries', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-5');

			const result = await nodeSearchTool.invoke(
				{
					queries: [buildNodeSearchQuery('name', 'nonexistent')],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, 'No nodes found matching "nonexistent"');
		});

		it('should handle validation errors for missing queries', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-6');

			try {
				await nodeSearchTool.invoke(
					{
						queries: [],
					},
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle validation error for invalid query type', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-7');

			try {
				await nodeSearchTool.invoke(
					{
						queries: [
							{
								// @ts-expect-error testing invalid query type
								queryType: 'invalid',
								query: 'test',
							},
						],
					},
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle subNodeSearch without connectionType', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-8');

			const result = await nodeSearchTool.invoke(
				{
					queries: [
						{
							queryType: 'subNodeSearch',
							// Missing connectionType
						},
					],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, 'No nodes found matching ""');
		});

		it('should handle name search without query', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-9');

			const result = await nodeSearchTool.invoke(
				{
					queries: [
						{
							queryType: 'name',
							// Missing query
						},
					],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, 'No nodes found matching ""');
		});

		it('should search nodes by alias', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-10');

			const result = await nodeSearchTool.invoke(
				{
					queries: [buildNodeSearchQuery('name', 'httpbinero')],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found');
			expect(message).toContain('<node_name>n8n-nodes-base.httpBin</node_name>');
		});

		it('should handle expression-based outputs in sub-node search', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-11');

			const result = await nodeSearchTool.invoke(
				{
					queries: [buildNodeSearchQuery('subNodeSearch', 'vector', NodeConnectionTypes.AiTool)],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			// Vector Store should appear because its expression contains 'ai_tool'
			// and its name contains 'vector'
			expectToolSuccess(content, 'Found');
			expect(message).toContain('<node_name>@n8n/n8n-nodes-langchain.vectorStore</node_name>');
		});

		it('should handle case-insensitive search', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-12');

			const result = await nodeSearchTool.invoke(
				{
					queries: [buildNodeSearchQuery('name', 'CODE')],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found');
			expect(message).toContain('<node_name>n8n-nodes-base.code</node_name>');
			expect(message).toContain('<node_name>@n8n/n8n-nodes-langchain.toolCode</node_name>');
		});

		it('should respect result limit', async () => {
			// Add many nodes that would match
			const manyHttpNodes = Array.from({ length: 20 }, (_, i) =>
				createNodeType({
					name: `test.http${i}`,
					displayName: `HTTP Node ${i}`,
					description: 'Another HTTP node',
				}),
			);
			const testNodeTypes = [...nodeTypesList, ...manyHttpNodes];
			const testTool = createNodeSearchTool(testNodeTypes).tool;

			const mockConfig = createToolConfig('search_nodes', 'test-call-13');

			const result = await testTool.invoke(
				{
					queries: [buildNodeSearchQuery('name', 'http')],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			// Count the number of <node> tags
			const nodeMatches = message.match(/<node>/g);
			expect(nodeMatches?.length).toBeLessThanOrEqual(15); // Default limit is 15
		});

		it('should track batch progress for multiple queries', async () => {
			const mockConfig = createToolConfigWithWriter('search_nodes', 'test-call-14');

			await nodeSearchTool.invoke(
				{
					queries: [
						buildNodeSearchQuery('name', 'http'),
						buildNodeSearchQuery('name', 'code'),
						buildNodeSearchQuery('subNodeSearch', undefined, NodeConnectionTypes.AiMemory),
					],
				},
				mockConfig,
			);

			const progressCalls = extractProgressMessages(mockConfig.writer);

			// Should have progress messages for batch processing
			const progressMessages = progressCalls.filter(
				(msg) => msg.status === 'running' && msg.updates.some((u) => u.type === 'progress'),
			);
			expect(progressMessages.length).toBeGreaterThan(0);

			// Check for batch-related progress messages
			const batchMessages = progressMessages.filter((msg) =>
				msg.updates.some(
					(u) => typeof u.data?.message === 'string' && u.data.message.includes('Searching nodes'),
				),
			);
			expect(batchMessages.length).toBeGreaterThan(0);
		});

		it('should handle mixed query results', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-15');

			const result = await nodeSearchTool.invoke(
				{
					queries: [
						buildNodeSearchQuery('name', 'nonexistent'),
						buildNodeSearchQuery('name', 'webhook'),
						// Search for a valid but non-existent connection type
						buildNodeSearchQuery(
							'subNodeSearch',
							'nonexistent',
							NodeConnectionTypes.AiOutputParser,
						),
					],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'No nodes found matching "nonexistent"');
			expect(message).toContain('Found 1 nodes matching "webhook"');
			expect(message).toContain(
				'No nodes found matching "sub-nodes with ai_outputParser output matching "nonexistent""',
			);
		});

		it('should include all node details in results', async () => {
			const mockConfig = createToolConfig('search_nodes', 'test-call-16');

			const result = await nodeSearchTool.invoke(
				{
					queries: [buildNodeSearchQuery('name', 'webhook')],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			// Check all required fields are present
			expect(message).toContain('<node_name>n8n-nodes-base.webhook</node_name>');
			expect(message).toContain(
				'<node_description>Starts workflow on webhook call</node_description>',
			);
			expect(message).toContain('<node_inputs>');
			expect(message).toContain('<node_outputs>');
		});
	});
});
