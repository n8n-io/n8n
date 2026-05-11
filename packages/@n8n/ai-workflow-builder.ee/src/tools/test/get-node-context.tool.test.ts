import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	createToolConfig,
	createMockRunData,
	createMockExecutionSchema,
	createMockSchema,
	createLargeTestData,
	setupWorkflowState,
	setupWorkflowStateWithContext,
	setupAIWorkflowConnections,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createGetNodeContextTool } from '../get-node-context.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('GetNodeContextTool', () => {
	let tool: ReturnType<typeof createGetNodeContextTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		tool = createGetNodeContextTool().tool;
	});

	describe('node not found', () => {
		it('should return error message when node does not exist', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-1');

			const result = await tool.invoke({ nodeName: 'NonExistent' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Node "NonExistent" not found');
			expect(message).toContain('Available nodes: Code');
		});
	});

	describe('basic node context', () => {
		it('should return context for a node with no connections', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 2 }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-2');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<node_context name="Code" id="code1">');
			expect(message).toContain('ID: code1');
			expect(message).toContain('Type: n8n-nodes-base.code');
			expect(message).toContain('Version: 2');
			expect(message).toContain('Parent nodes: None (this is a start node)');
			expect(message).toContain('Child nodes: None (this is an end node)');
			expect(message).toContain('</node_context>');
		});
	});

	describe('node connections', () => {
		it('should show parent connections for downstream node', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			workflow.connections = {
				Webhook: {
					main: [[{ node: 'Code', type: 'main', index: 0 }]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-3');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Parent nodes (upstream):');
			expect(message).toContain('← Webhook');
		});

		it('should show child connections for upstream node', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			workflow.connections = {
				Webhook: {
					main: [[{ node: 'Code', type: 'main', index: 0 }]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-4');

			const result = await tool.invoke({ nodeName: 'Webhook' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Child nodes (downstream):');
			expect(message).toContain('→ Code');
		});
	});

	describe('node classification', () => {
		it('should classify trigger nodes', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-5');

			const result = await tool.invoke({ nodeName: 'Webhook' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Classification: trigger');
		});

		it('should classify manual trigger nodes', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'trigger1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-6');

			const result = await tool.invoke({ nodeName: 'Manual Trigger' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Classification: trigger');
		});

		it('should classify ai_parent nodes (AI Agent)', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'agent1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
				}),
				createNode({
					id: 'model1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
			]);
			setupAIWorkflowConnections(workflow, 'OpenAI Model', 'AI Agent');
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-7');

			const result = await tool.invoke({ nodeName: 'AI Agent' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Classification: ai_parent');
		});

		it('should classify ai_subnode nodes (LLM)', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'agent1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
				}),
				createNode({
					id: 'model1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
			]);
			setupAIWorkflowConnections(workflow, 'OpenAI Model', 'AI Agent');
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-8');

			const result = await tool.invoke({ nodeName: 'OpenAI Model' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Classification: ai_subnode');
		});

		it('should classify regular nodes', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-9');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Classification: regular');
		});
	});

	describe('node parameters', () => {
		it('should display node parameters', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'code1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					parameters: {
						jsCode: 'return items;',
						mode: 'runOnceForAllItems',
					},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-10');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Parameters:');
			expect(message).toContain('jsCode');
			expect(message).toContain('return items;');
			expect(message).toContain('mode');
		});

		it('should show no parameters message when empty', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code', parameters: {} }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-11');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('(no parameters set)');
		});
	});

	describe('execution data', () => {
		it('should include execution schema when available', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: createMockExecutionSchema([
					{
						nodeName: 'Code',
						schema: createMockSchema('object', '', [
							createMockSchema('string', 'name', 'test', 'name'),
						]),
					},
				]),
			});

			const mockConfig = createToolConfig('get_node_context', 'test-call-12');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Output schema (from last execution):');
			expect(message).toContain('name');
		});

		it('should include execution runData when available', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: {
					runData: createMockRunData({
						Code: [{ json: { result: 'test' } }],
					}),
				},
			});

			const mockConfig = createToolConfig('get_node_context', 'test-call-13');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Execution data (from last run):');
			expect(message).toContain('result');
		});

		it('should exclude execution data when includeExecutionData is false', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: createMockExecutionSchema([
					{
						nodeName: 'Code',
						schema: createMockSchema('object', '', [
							createMockSchema('string', 'name', 'test', 'name'),
						]),
					},
				]),
				executionData: {
					runData: createMockRunData({
						Code: [{ json: { result: 'test' } }],
					}),
				},
			});

			const mockConfig = createToolConfig('get_node_context', 'test-call-14');

			const result = await tool.invoke(
				{ nodeName: 'Code', includeExecutionData: false },
				mockConfig,
			);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).not.toContain('Output schema');
			expect(message).not.toContain('Execution data');
		});

		it('should truncate large execution data', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			// Create large data that exceeds 2000 characters
			const largeItems = createLargeTestData(100, 30).map((data) => ({
				json: data,
			}));

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: {
					runData: {
						Code: [
							{
								data: { main: [largeItems] },
								startTime: Date.now(),
								executionTime: 100,
								executionIndex: 0,
								source: [null],
							},
						],
					},
				},
			});

			const mockConfig = createToolConfig('get_node_context', 'test-call-15');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Execution data (from last run):');
			expect(message).toContain('... (truncated)');
		});

		it('should show no execution data message when none available', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, { workflow });

			const mockConfig = createToolConfig('get_node_context', 'test-call-16');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution data available for this node');
		});
	});

	describe('AI connection formatting', () => {
		it('should show AI connection types in parent nodes', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'agent1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
				}),
				createNode({
					id: 'model1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
			]);
			setupAIWorkflowConnections(workflow, 'OpenAI Model', 'AI Agent');
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-17');

			const result = await tool.invoke({ nodeName: 'AI Agent' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('←[ai_languageModel] OpenAI Model');
		});

		it('should show AI connection types in child nodes', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'agent1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
				}),
				createNode({
					id: 'model1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
			]);
			setupAIWorkflowConnections(workflow, 'OpenAI Model', 'AI Agent');
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_node_context', 'test-call-18');

			const result = await tool.invoke({ nodeName: 'OpenAI Model' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('-[ai_languageModel]-> AI Agent');
		});
	});
});
