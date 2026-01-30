import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	createToolConfig,
	setupWorkflowState,
	expectToolSuccess,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createGetWorkflowJsonTool } from '../get-workflow-json.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('GetWorkflowJsonTool', () => {
	let tool: ReturnType<typeof createGetWorkflowJsonTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		tool = createGetWorkflowJsonTool().tool;
	});

	describe('empty workflow', () => {
		it('should return empty JSON for workflow with no nodes', async () => {
			const emptyWorkflow = createWorkflow([]);
			setupWorkflowState(mockGetCurrentTaskInput, emptyWorkflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-1');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, '{"nodes": [], "connections": {}}');
		});
	});

	describe('full workflow (no filter)', () => {
		it('should return all nodes and connections', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({
					id: 'http1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
				}),
			]);
			workflow.connections = {
				Webhook: {
					main: [[{ node: 'Code', type: 'main', index: 0 }]],
				},
				Code: {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-2');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<workflow_json>');
			expect(message).toContain('"Webhook"');
			expect(message).toContain('"Code"');
			expect(message).toContain('"HTTP Request"');
			expect(message).toContain('</workflow_json>');
			// Should have connections
			expect(message).toContain('"connections"');
			expect(message).not.toContain('"connections": {}');
		});
	});

	describe('filter by node names', () => {
		it('should return only specified nodes', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({
					id: 'http1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
				}),
			]);
			workflow.connections = {
				Webhook: {
					main: [[{ node: 'Code', type: 'main', index: 0 }]],
				},
				Code: {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-3');

			const result = await tool.invoke({ nodeNames: ['Webhook', 'Code'] }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('"Webhook"');
			expect(message).toContain('"Code"');
			// HTTP Request should not be in nodes
			expect(message).not.toMatch(/"name":\s*"HTTP Request"/);
		});

		it('should note non-existent nodes in filter', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-4');

			const result = await tool.invoke({ nodeNames: ['Code', 'NonExistent'] }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<note>Nodes not found: NonExistent</note>');
		});
	});

	describe('includeConnections option', () => {
		it('should exclude connections when includeConnections is false', async () => {
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

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-5');

			const result = await tool.invoke({ includeConnections: false }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('"connections": {}');
		});
	});

	describe('connection filtering with node filter', () => {
		it('should filter connections based on selected nodes', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'node1', name: 'A', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'B', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node3', name: 'C', type: 'n8n-nodes-base.code' }),
			]);
			workflow.connections = {
				A: {
					main: [[{ node: 'B', type: 'main', index: 0 }]],
				},
				B: {
					main: [[{ node: 'C', type: 'main', index: 0 }]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-6');

			// Only include A - connection A→B should be excluded because B is not in filter
			const result = await tool.invoke({ nodeNames: ['A'] }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('"A"');
			// Connections should be empty since B is not in filter
			expect(message).toContain('"connections": {}');
		});

		it('should keep connections between filtered nodes', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'node1', name: 'A', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'B', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node3', name: 'C', type: 'n8n-nodes-base.code' }),
			]);
			workflow.connections = {
				A: {
					main: [[{ node: 'B', type: 'main', index: 0 }]],
				},
				B: {
					main: [[{ node: 'C', type: 'main', index: 0 }]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-7');

			// Include A and B - connection A→B should be kept
			const result = await tool.invoke({ nodeNames: ['A', 'B'] }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			// Connection from A to B should exist
			expect(message).toMatch(/"A":\s*\{[\s\S]*"main"/);
		});
	});

	describe('large parameter trimming', () => {
		it('should trim large parameter values', async () => {
			const largeValue = 'x'.repeat(15000);
			const workflow = createWorkflow([
				createNode({
					id: 'code1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					parameters: { jsCode: largeValue },
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-8');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			// Large value should be trimmed
			expect(message).not.toContain(largeValue);
			expect(message).toContain('[Large value omitted]');
			// Should note about using get_node_parameter
			expect(message).toContain('Use get_node_parameter tool for full values');
		});
	});

	describe('note about get_node_parameter', () => {
		it('should include note about using get_node_parameter', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-9');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain(
				'<note>Large parameter values may be trimmed. Use get_node_parameter tool for full values.</note>',
			);
		});
	});

	describe('default values', () => {
		it('should include connections by default', async () => {
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

			const mockConfig = createToolConfig('get_workflow_json', 'test-call-10');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			// Should have connections (not empty)
			expect(message).not.toContain('"connections": {}');
			expect(message).toContain('"Webhook"');
		});
	});
});
