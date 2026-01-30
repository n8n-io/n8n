import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	createToolConfig,
	setupWorkflowState,
	setupAIWorkflowConnections,
	expectToolSuccess,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createGetWorkflowOverviewTool } from '../get-workflow-overview.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('GetWorkflowOverviewTool', () => {
	let tool: ReturnType<typeof createGetWorkflowOverviewTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		tool = createGetWorkflowOverviewTool().tool;
	});

	describe('empty workflow', () => {
		it('should return empty message for workflow with no nodes', async () => {
			const emptyWorkflow = createWorkflow([]);
			setupWorkflowState(mockGetCurrentTaskInput, emptyWorkflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-1');

			const result = await tool.invoke({ format: 'mermaid' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, 'Empty workflow - no nodes to display');
		});
	});

	describe('mermaid format', () => {
		it('should return mermaid diagram for single node workflow', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-2');

			const result = await tool.invoke({ format: 'mermaid' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<workflow_overview>');
			expect(message).toContain('```mermaid');
			expect(message).toContain('flowchart TD');
			expect(message).toContain('[node1]'); // Node ID should be included
			expect(message).toContain('</workflow_overview>');
		});

		it('should return mermaid diagram showing flow for multi-node connected workflow', async () => {
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

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-3');

			const result = await tool.invoke({ format: 'mermaid' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('```mermaid');
			expect(message).toContain('-->'); // Arrow indicating connection
			expect(message).toContain('[trigger1]');
			expect(message).toContain('[code1]');
			expect(message).toContain('[http1]');
		});

		it('should include parameters when includeParameters is true', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'code1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					parameters: { jsCode: 'return items;' },
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-4');

			const result = await tool.invoke({ format: 'mermaid', includeParameters: true }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('jsCode');
		});
	});

	describe('summary format', () => {
		it('should return summary format output with node list', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-5');

			const result = await tool.invoke({ format: 'summary' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('<workflow_summary>');
			expect(message).toContain('Node count: 2');
			expect(message).toContain('Nodes:');
			expect(message).toContain('Webhook [id: trigger1]');
			expect(message).toContain('Code [id: code1]');
			expect(message).toContain('</workflow_summary>');
		});

		it('should include parameters in summary when includeParameters is true', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'code1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					parameters: { jsCode: 'return items;' },
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-6');

			const result = await tool.invoke({ format: 'summary', includeParameters: true }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Parameters:');
			expect(message).toContain('jsCode');
		});
	});

	describe('trigger node detection', () => {
		it('should detect webhook trigger node', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'trigger1', name: 'My Webhook', type: 'n8n-nodes-base.webhook' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-7');

			const result = await tool.invoke({ format: 'mermaid' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Trigger: My Webhook');
		});

		it('should detect manual trigger node', async () => {
			const workflow = createWorkflow([
				createNode({
					id: 'trigger1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-8');

			const result = await tool.invoke({ format: 'summary' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Trigger: Manual Trigger');
		});

		it('should show no trigger when workflow has none', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-9');

			const result = await tool.invoke({ format: 'mermaid' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('Trigger: None');
		});
	});

	describe('AI workflow with sub-nodes', () => {
		it('should show AI connections with dotted arrows', async () => {
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

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-10');

			const result = await tool.invoke({ format: 'mermaid' }, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			// Dotted arrows for AI connections
			expect(message).toContain('ai_languageModel');
		});
	});

	describe('default values', () => {
		it('should use mermaid format by default', async () => {
			const workflow = createWorkflow([
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, workflow);

			const mockConfig = createToolConfig('get_workflow_overview', 'test-call-11');

			const result = await tool.invoke({}, mockConfig);
			const content = parseToolResult<ParsedToolContent>(result);

			const message = content.update.messages[0]?.kwargs.content;
			expect(message).toContain('```mermaid');
		});
	});
});
