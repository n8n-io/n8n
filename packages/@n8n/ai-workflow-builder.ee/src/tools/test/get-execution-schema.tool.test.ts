import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	createToolConfig,
	createMockExecutionSchema,
	createMockSchema,
	setupWorkflowStateWithContext,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createGetExecutionSchemaTool } from '../get-execution-schema.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('GetExecutionSchemaTool', () => {
	let tool: ReturnType<typeof createGetExecutionSchemaTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		tool = createGetExecutionSchemaTool().tool;
	});

	describe('no execution schema', () => {
		it('should return no schema message when workflowContext is empty', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, { workflow });

			const mockConfig = createToolConfig('get_execution_schema', 'test-call-1');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution schema available');
		});

		it('should return no schema message when executionSchema is empty array', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: [],
			});

			const mockConfig = createToolConfig('get_execution_schema', 'test-call-2');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution schema available');
		});
	});

	describe('schema retrieval', () => {
		it('should return schema for all nodes when no filter', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: createMockExecutionSchema([
					{
						nodeName: 'Code',
						schema: createMockSchema('object', '', [
							createMockSchema('string', 'result', 'test', 'result'),
						]),
					},
					{
						nodeName: 'HTTP Request',
						schema: createMockSchema('object', '', [createMockSchema('array', 'data', [], 'data')]),
					},
				]),
			});

			const mockConfig = createToolConfig('get_execution_schema', 'test-call-3');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_schema>');
			expect(message).toContain('Code');
			expect(message).toContain('HTTP Request');
			expect(message).toContain('result');
			expect(message).toContain('data');
		});

		it('should return schema with complex nested structure', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: createMockExecutionSchema([
					{
						nodeName: 'Code',
						schema: createMockSchema('array', '', [
							createMockSchema('object', '[0]', [
								createMockSchema(
									'object',
									'[0].user',
									[
										createMockSchema('string', '[0].user.name', 'John', 'name'),
										createMockSchema('string', '[0].user.email', 'john@example.com', 'email'),
									],
									'user',
								),
								createMockSchema('array', '[0].items', [], 'items'),
							]),
						]),
					},
				]),
			});

			const mockConfig = createToolConfig('get_execution_schema', 'test-call-4');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_schema>');
			expect(message).toContain('user');
			expect(message).toContain('name');
			expect(message).toContain('email');
		});
	});

	describe('filtering by nodeName', () => {
		it('should filter schema to specific node', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: createMockExecutionSchema([
					{
						nodeName: 'Code',
						schema: createMockSchema('object', '', [createMockSchema('number', 'a', '1', 'a')]),
					},
					{
						nodeName: 'HTTP Request',
						schema: createMockSchema('object', '', [createMockSchema('string', 'b', 'test', 'b')]),
					},
				]),
			});

			const mockConfig = createToolConfig('get_execution_schema', 'test-call-5');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<execution_schema>');
			expect(message).toContain('Code');
			expect(message).toContain('"a"');
			expect(message).not.toContain('HTTP Request');
			expect(message).not.toContain('"b"');
		});

		it('should return not found message when filtered node has no schema', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: createMockExecutionSchema([
					{
						nodeName: 'HTTP Request',
						schema: createMockSchema('object', '', [createMockSchema('string', 'b', 'test', 'b')]),
					},
				]),
			});

			const mockConfig = createToolConfig('get_execution_schema', 'test-call-6');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No execution schema found for node "Code"');
		});
	});

	describe('multiple schema entries', () => {
		it('should handle multiple nodes with schemas', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
				createNode({ id: 'set1', name: 'Set', type: 'n8n-nodes-base.set' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				executionSchema: createMockExecutionSchema([
					{
						nodeName: 'Webhook',
						schema: createMockSchema('object', '', [
							createMockSchema('object', 'body', [], 'body'),
						]),
					},
					{
						nodeName: 'Code',
						schema: createMockSchema('object', '', [
							createMockSchema('string', 'output', 'result', 'output'),
						]),
					},
					{
						nodeName: 'HTTP Request',
						schema: createMockSchema('array', '', []),
					},
					{
						nodeName: 'Set',
						schema: createMockSchema('object', '', [
							createMockSchema('number', 'newField', '123', 'newField'),
						]),
					},
				]),
			});

			const mockConfig = createToolConfig('get_execution_schema', 'test-call-7');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Webhook');
			expect(message).toContain('Code');
			expect(message).toContain('HTTP Request');
			expect(message).toContain('Set');
		});
	});
});
