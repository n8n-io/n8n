import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	createToolConfig,
	createMockRunData,
	createLargeTestData,
	setupWorkflowStateWithContext,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createGetExecutionLogsTool } from '../get-execution-logs.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('GetExecutionLogsTool', () => {
	let tool: ReturnType<typeof createGetExecutionLogsTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		tool = createGetExecutionLogsTool().tool;
	});

	describe('no execution data', () => {
		it('should return no logs message when execution data is undefined', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, { workflow });

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-1');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution logs available');
		});

		it('should return no logs message when runData is empty and no error', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: { runData: {} },
			});

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-2');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution logs available');
		});
	});

	describe('error handling', () => {
		it('should include error information when execution has error', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: {
					runData: { Code: [] },
					lastNodeExecuted: 'Code',
					error: {
						message: 'Test error message',
						description: 'Detailed error description',
					},
				},
			});

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-3');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_error>');
			expect(message).toContain('<last_node_executed>Code</last_node_executed>');
			expect(message).toContain('<error_details>');
			expect(message).toContain('Test error message');
		});

		it('should handle error with no lastNodeExecuted', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: {
					runData: {},
					error: { message: 'Error occurred before any node executed' },
				},
			});

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-4');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_error>');
			expect(message).not.toContain('<last_node_executed>');
		});
	});

	describe('runData handling', () => {
		it('should include runData when present', async () => {
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

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-5');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_run_data>');
			expect(message).toContain('Code');
			expect(message).toContain('result');
		});

		it('should include both error and runData when both present', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: {
					runData: createMockRunData({
						Code: [{ json: { result: 'ok' } }],
					}),
					lastNodeExecuted: 'HTTP Request',
					error: { message: 'HTTP request failed' },
				},
			});

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-6');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_error>');
			expect(message).toContain('<execution_run_data>');
		});
	});

	describe('filtering by nodeName', () => {
		it('should filter runData to specific node', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: {
					runData: createMockRunData({
						Code: [{ json: { a: 1 } }],
						'HTTP Request': [{ json: { b: 2 } }],
					}),
				},
			});

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-7');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_run_data>');
			expect(message).toContain('"a": 1');
			expect(message).not.toContain('"b": 2');
		});

		it('should show message when filtered node has no data', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: {
					runData: createMockRunData({
						'HTTP Request': [{ json: { b: 2 } }],
					}),
				},
			});

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-8');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution data found for node "Code"');
		});

		it('should show not found message when node has no execution logs', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionData: { runData: {} },
			});

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-9');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution logs found for node "Code"');
		});
	});

	describe('truncation of large data', () => {
		it('should truncate large execution data', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			// Create large data that exceeds MAX_EXECUTION_DATA_CHARS (10000)
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

			const mockConfig = createToolConfig('get_execution_logs', 'test-call-10');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('... (truncated)');
		});
	});
});
