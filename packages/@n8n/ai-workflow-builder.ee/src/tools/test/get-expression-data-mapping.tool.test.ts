import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	createToolConfig,
	setupWorkflowStateWithContext,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createGetExpressionDataMappingTool } from '../get-expression-data-mapping.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('GetExpressionDataMappingTool', () => {
	let tool: ReturnType<typeof createGetExpressionDataMappingTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		tool = createGetExpressionDataMappingTool().tool;
	});

	describe('no expression data', () => {
		it('should return no data message when workflowContext has no expressions', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, { workflow });

			const mockConfig = createToolConfig('get_expression_data_mapping', 'test-call-1');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No expression data mapping available');
		});

		it('should return no data message when expressionValues is empty object', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				expressionValues: {},
			});

			const mockConfig = createToolConfig('get_expression_data_mapping', 'test-call-2');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No expression data mapping available');
		});
	});

	describe('expression data retrieval', () => {
		it('should return expression data for all nodes when no filter', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				expressionValues: {
					Code: [
						{ expression: '{{ $json.name }}', resolvedValue: 'John' },
						{ expression: '{{ $json.email }}', resolvedValue: 'john@example.com' },
					],
					'HTTP Request': [
						{ expression: '{{ $json.url }}', resolvedValue: 'https://api.example.com' },
					],
				},
			});

			const mockConfig = createToolConfig('get_expression_data_mapping', 'test-call-3');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<expression_data_mapping>');
			expect(message).toContain('Code');
			expect(message).toContain('HTTP Request');
			expect(message).toContain('$json.name');
			expect(message).toContain('John');
			expect(message).toContain('$json.url');
		});

		it('should return expression data with complex resolved values', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				expressionValues: {
					Code: [
						{
							expression: '{{ $json.user }}',
							resolvedValue: { name: 'John', email: 'john@example.com' },
						},
						{ expression: '{{ $json.items }}', resolvedValue: [1, 2, 3] },
					],
				},
			});

			const mockConfig = createToolConfig('get_expression_data_mapping', 'test-call-4');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<expression_data_mapping>');
			expect(message).toContain('name');
			expect(message).toContain('John');
			expect(message).toContain('email');
		});
	});

	describe('filtering by nodeName', () => {
		it('should filter expression data to specific node', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				expressionValues: {
					Code: [{ expression: '{{ $json.a }}', resolvedValue: 'valueA' }],
					'HTTP Request': [{ expression: '{{ $json.b }}', resolvedValue: 'valueB' }],
				},
			});

			const mockConfig = createToolConfig('get_expression_data_mapping', 'test-call-5');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<expression_data_mapping>');
			expect(message).toContain('Code');
			expect(message).toContain('valueA');
			expect(message).not.toContain('HTTP Request');
			expect(message).not.toContain('valueB');
		});

		it('should return not found message when filtered node has no expressions', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				expressionValues: {
					'HTTP Request': [{ expression: '{{ $json.b }}', resolvedValue: 'valueB' }],
				},
			});

			const mockConfig = createToolConfig('get_expression_data_mapping', 'test-call-6');

			const result = await tool.invoke({ nodeName: 'Code' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('No expression data mapping found for node "Code"');
		});
	});

	describe('multiple nodes with expressions', () => {
		it('should handle multiple nodes with expressions', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
				createNode({ id: 'set1', name: 'Set', type: 'n8n-nodes-base.set' }),
			]);

			setupWorkflowStateWithContext(mockGetCurrentTaskInput, {
				workflow,
				expressionValues: {
					Code: [{ expression: '{{ $json.input }}', resolvedValue: 'test input' }],
					'HTTP Request': [
						{ expression: '{{ $json.endpoint }}', resolvedValue: '/api/data' },
						{ expression: '{{ $json.token }}', resolvedValue: 'abc123' },
					],
					Set: [{ expression: '{{ $json.result }}', resolvedValue: 42 }],
				},
			});

			const mockConfig = createToolConfig('get_expression_data_mapping', 'test-call-7');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Code');
			expect(message).toContain('HTTP Request');
			expect(message).toContain('Set');
			expect(message).toContain('input');
			expect(message).toContain('endpoint');
			expect(message).toContain('result');
		});
	});
});
