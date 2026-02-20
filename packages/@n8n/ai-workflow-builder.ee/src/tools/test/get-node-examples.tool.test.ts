import { getCurrentTaskInput } from '@langchain/langgraph';
import type { IConnections, INode } from 'n8n-workflow';

import {
	parseToolResult,
	createToolConfig,
	expectToolSuccess,
	type ParsedToolContent,
	createNode,
} from '../../../test/test-utils';
import type { WorkflowMetadata } from '../../types/tools';
import { createGetNodeExamplesTool } from '../get-node-examples.tool';
import * as expressionUtils from '../utils/expression-extraction.utils';
import type { FetchWorkflowsResult } from '../web/templates';
import * as templates from '../web/templates';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

// Mock the templates module
jest.mock('../web/templates');

// Mock expression extraction utils
jest.mock('../utils/expression-extraction.utils');

const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
	typeof getCurrentTaskInput
>;
const mockFetchWorkflowsFromTemplates =
	templates.fetchWorkflowsFromTemplates as jest.MockedFunction<
		typeof templates.fetchWorkflowsFromTemplates
	>;
const mockFetchAndFormatExpressionExamples =
	expressionUtils.fetchAndFormatExpressionExamples as jest.MockedFunction<
		typeof expressionUtils.fetchAndFormatExpressionExamples
	>;

describe('GetNodeExamplesTool', () => {
	let tool: ReturnType<typeof createGetNodeExamplesTool>['tool'];

	beforeEach(() => {
		jest.clearAllMocks();
		tool = createGetNodeExamplesTool().tool;

		// Default: no cached templates
		mockGetCurrentTaskInput.mockReturnValue({
			cachedTemplates: [],
			workflowJSON: { nodes: [], connections: {}, name: 'Test' },
			messages: [],
		});
	});

	// Helper to create mock workflow metadata with specific nodes
	let mockTemplateIdCounter = 1;
	const createMockWorkflow = (
		name: string,
		nodes: INode[],
		connections: IConnections = {},
	): WorkflowMetadata => ({
		templateId: mockTemplateIdCounter++,
		name,
		description: `Workflow: ${name}`,
		workflow: { nodes, connections, name },
	});

	// Helper to create mock fetch result
	const createMockFetchResult = (workflows: WorkflowMetadata[]): FetchWorkflowsResult => ({
		workflows,
		totalFound: workflows.length,
		templateIds: workflows.map((_, i) => i + 1),
	});

	describe('type: "full" (configuration examples)', () => {
		it('should fetch configuration examples from API', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-1');

			mockFetchWorkflowsFromTemplates.mockResolvedValue(
				createMockFetchResult([
					createMockWorkflow('API Workflow', [
						createNode({
							id: 'http-1',
							name: 'Fetch Data',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							parameters: { url: 'https://api.example.com', method: 'GET' },
						}),
					]),
				]),
			);

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.httpRequest', type: 'full' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Node Configuration Examples');
			expect(message).toContain('httpRequest');
			expect(message).toContain('https://api.example.com');
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledWith(
				{ nodes: 'n8n-nodes-base.httpRequest', rows: 5 },
				expect.any(Object),
			);
		});

		it('should use cached templates when available', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-2');

			mockGetCurrentTaskInput.mockReturnValue({
				cachedTemplates: [
					createMockWorkflow('Cached Workflow', [
						createNode({
							id: 'code-1',
							name: 'Transform',
							type: 'n8n-nodes-base.code',
							typeVersion: 1,
							parameters: { jsCode: 'return items;', mode: 'runOnceForAllItems' },
						}),
					]),
				],
				workflowJSON: { nodes: [], connections: {}, name: 'Test' },
				messages: [],
			});

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.code', type: 'full' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Node Configuration Examples');
			expect(message).toContain('return items;');
			// Should NOT call API since we found cached data
			expect(mockFetchWorkflowsFromTemplates).not.toHaveBeenCalled();
		});

		it('should return no examples message when node not found', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-3');

			mockFetchWorkflowsFromTemplates.mockResolvedValue(createMockFetchResult([]));

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.unknownNode', type: 'full' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'No examples found');
			expect(message).toContain('unknownNode');
		});
	});

	describe('type: "expressions"', () => {
		it('should fetch expression examples via fetchAndFormatExpressionExamples', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-expr-1');

			mockFetchAndFormatExpressionExamples.mockResolvedValue({
				formatted: {
					'n8n-nodes-base.webhook':
						'## n8n-nodes-base.webhook — verified output fields:\n- body\n- headers',
				},
				newTemplates: [],
			});

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.webhook', type: 'expressions' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('n8n-nodes-base.webhook');
			expect(message).toContain('body');
			expect(mockFetchAndFormatExpressionExamples).toHaveBeenCalledWith(
				['n8n-nodes-base.webhook'],
				[],
				undefined,
			);
		});

		it('should batch multiple expression requests in a single call', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-expr-batch');

			mockFetchAndFormatExpressionExamples.mockResolvedValue({
				formatted: {
					'n8n-nodes-base.webhook': '## webhook fields:\n- body',
					'n8n-nodes-base.jiraTrigger': '## jira fields:\n- issue.key',
				},
				newTemplates: [],
			});

			const result = await tool.invoke(
				{
					nodes: [
						{ nodeType: 'n8n-nodes-base.webhook', type: 'expressions' },
						{ nodeType: 'n8n-nodes-base.jiraTrigger', type: 'expressions' },
					],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('webhook');
			expect(message).toContain('jira');
			// Should be called once with both node types batched
			expect(mockFetchAndFormatExpressionExamples).toHaveBeenCalledTimes(1);
			expect(mockFetchAndFormatExpressionExamples).toHaveBeenCalledWith(
				['n8n-nodes-base.webhook', 'n8n-nodes-base.jiraTrigger'],
				[],
				undefined,
			);
		});

		it('should return no examples when expression extraction returns empty', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-expr-empty');

			mockFetchAndFormatExpressionExamples.mockResolvedValue({
				formatted: {},
				newTemplates: [],
			});

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.unknownNode', type: 'expressions' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('No examples found');
			expect(message).toContain('n8n-nodes-base.unknownNode');
		});
	});

	describe('mixed types in single call', () => {
		it('should handle both expressions and full types in one request', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-mixed');

			// Mock expression path
			mockFetchAndFormatExpressionExamples.mockResolvedValue({
				formatted: {
					'n8n-nodes-base.webhook': '## webhook fields:\n- body.email',
				},
				newTemplates: [],
			});

			// Mock full config path
			mockFetchWorkflowsFromTemplates.mockResolvedValue(
				createMockFetchResult([
					createMockWorkflow('Telegram Workflow', [
						createNode({
							id: 'tg-1',
							name: 'Send Message',
							type: 'n8n-nodes-base.telegram',
							typeVersion: 1,
							parameters: { chatId: '123', text: 'Hello' },
						}),
					]),
				]),
			);

			const result = await tool.invoke(
				{
					nodes: [
						{ nodeType: 'n8n-nodes-base.webhook', type: 'expressions' },
						{ nodeType: 'n8n-nodes-base.telegram', type: 'full' },
					],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			// Should contain both expression and configuration examples
			expect(message).toContain('webhook');
			expect(message).toContain('body.email');
			expect(message).toContain('telegram');
			expect(message).toContain('Hello');

			// Both paths should have been called
			expect(mockFetchAndFormatExpressionExamples).toHaveBeenCalledTimes(1);
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledTimes(1);
		});
	});

	describe('state updates', () => {
		interface ParsedToolContentWithState extends ParsedToolContent {
			update: ParsedToolContent['update'] & {
				cachedTemplates?: WorkflowMetadata[];
			};
		}

		it('should cache new templates in state when fetched from API for full config', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-cache-1');

			const fetchedWorkflows = [
				createMockWorkflow('New Workflow', [
					createNode({
						id: 'set-1',
						name: 'Set Data',
						type: 'n8n-nodes-base.set',
						parameters: { mode: 'manual' },
					}),
				]),
			];

			mockFetchWorkflowsFromTemplates.mockResolvedValue(createMockFetchResult(fetchedWorkflows));

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.set', type: 'full' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContentWithState>(result);

			expectToolSuccess(content, 'Node Configuration Examples');
			expect(content.update.cachedTemplates).toEqual(fetchedWorkflows);
		});

		it('should cache new templates from expression examples', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-cache-2');

			const newTemplates = [
				createMockWorkflow('Template', [
					createNode({ id: 'wh-1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				]),
			];

			mockFetchAndFormatExpressionExamples.mockResolvedValue({
				formatted: {
					'n8n-nodes-base.webhook': '## webhook fields:\n- body',
				},
				newTemplates,
			});

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.webhook', type: 'expressions' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContentWithState>(result);
			expect(content.update.cachedTemplates).toEqual(newTemplates);
		});

		it('should not update state when using cached templates', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-cache-3');

			mockGetCurrentTaskInput.mockReturnValue({
				cachedTemplates: [
					createMockWorkflow('Already Cached', [
						createNode({ id: 'merge', name: 'Merge', type: 'n8n-nodes-base.merge' }),
					]),
				],
				workflowJSON: { nodes: [], connections: {}, name: 'Test' },
				messages: [],
			});

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.merge', type: 'full' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContentWithState>(result);

			expectToolSuccess(content, 'Node Configuration Examples');
			expect(content.update.cachedTemplates).toBeUndefined();
		});
	});

	describe('error handling', () => {
		it('should handle API fetch errors gracefully for full config', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-err-1');

			mockFetchWorkflowsFromTemplates.mockRejectedValue(new Error('API unavailable'));

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.httpRequest', type: 'full' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			// Should still return a result (with "No examples found" fallback)
			expect(message).toContain('No examples found');
		});

		it('should handle expression fetch errors', async () => {
			const mockConfig = createToolConfig('get_node_examples', 'test-err-2');

			mockFetchAndFormatExpressionExamples.mockRejectedValue(new Error('Network error'));

			const result = await tool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.webhook', type: 'expressions' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('Error');
		});
	});
});
