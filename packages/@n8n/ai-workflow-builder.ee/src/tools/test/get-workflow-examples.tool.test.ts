import type { INode } from 'n8n-workflow';

import {
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	createToolConfig,
	expectToolSuccess,
	type ParsedToolContent,
	createNode,
} from '../../../test/test-utils';
import type { WorkflowMetadata } from '../../types/tools';
import { createGetWorkflowExamplesTool } from '../get-workflow-examples.tool';
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

describe('GetWorkflowExamplesTool', () => {
	let getWorkflowExamplesTool: ReturnType<typeof createGetWorkflowExamplesTool>['tool'];
	const mockFetchWorkflowsFromTemplates =
		templates.fetchWorkflowsFromTemplates as jest.MockedFunction<
			typeof templates.fetchWorkflowsFromTemplates
		>;

	beforeEach(() => {
		jest.clearAllMocks();
		getWorkflowExamplesTool = createGetWorkflowExamplesTool().tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	// Helper to create mock workflow nodes
	const createMockWorkflowNodes = (count: number = 3): INode[] => {
		return Array.from({ length: count }, (_, i) =>
			createNode({
				id: `node-${i}`,
				name: `Node ${i}`,
				type: 'n8n-nodes-base.httpRequest',
			}),
		);
	};

	// Helper to create mock workflow metadata
	let mockTemplateIdCounter = 1;
	const createMockWorkflowMetadata = (
		name: string,
		description: string,
		nodeCount: number = 3,
	): WorkflowMetadata => ({
		templateId: mockTemplateIdCounter++,
		name,
		description,
		workflow: {
			nodes: createMockWorkflowNodes(nodeCount),
			connections: {},
			name,
		},
	});

	// Helper to create mock fetch result
	const createMockFetchResult = (
		workflows: WorkflowMetadata[],
		templateIds: number[] = workflows.map((_, i) => i + 1),
	): FetchWorkflowsResult => ({
		workflows,
		totalFound: workflows.length,
		templateIds,
	});

	describe('invoke', () => {
		it('should successfully fetch workflow examples with search query', async () => {
			const mockConfig = createToolConfigWithWriter('get_workflow_examples', 'test-call-1');

			// Mock API response
			mockFetchWorkflowsFromTemplates.mockResolvedValue(
				createMockFetchResult([
					createMockWorkflowMetadata('Email Automation', 'Automate email workflows', 3),
					createMockWorkflowMetadata('Slack Notification', 'Send Slack notifications', 4),
				]),
			);

			const result = await getWorkflowExamplesTool.invoke(
				{
					queries: [{ search: 'email automation' }],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found 2 workflow example(s)');
			expect(message).toContain('Email Automation');
			expect(message).toContain('Automate email workflows');
			expect(message).toContain('Slack Notification');
			expect(message).toContain('Send Slack notifications');
			// Verify mermaid diagrams are included
			expect(message).toContain('```mermaid');
			expect(message).toContain('flowchart TD');

			// Verify API call
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledWith(
				{ search: 'email automation' },
				expect.any(Object),
			);

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should handle multiple queries and combine results', async () => {
			const mockConfig = createToolConfig('get_workflow_examples', 'test-call-3');

			// Set up mocks for two queries
			mockFetchWorkflowsFromTemplates
				.mockResolvedValueOnce(
					createMockFetchResult([createMockWorkflowMetadata('Workflow 1', 'Description 1', 2)]),
				)
				.mockResolvedValueOnce(
					createMockFetchResult([createMockWorkflowMetadata('Workflow 2', 'Description 2', 3)]),
				);

			const result = await getWorkflowExamplesTool.invoke(
				{
					queries: [{ search: 'database' }, { search: 'api' }],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Found 2 workflow example');
			expect(message).toContain('Workflow 1');
			expect(message).toContain('Workflow 2');

			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledTimes(2);
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenNthCalledWith(
				1,
				{ search: 'database' },
				expect.any(Object),
			);
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenNthCalledWith(
				2,
				{ search: 'api' },
				expect.any(Object),
			);
		});

		it('should return no results message when no workflows found', async () => {
			const mockConfig = createToolConfig('get_workflow_examples', 'test-call-4');

			mockFetchWorkflowsFromTemplates.mockResolvedValue({
				workflows: [],
				totalFound: 0,
				templateIds: [],
			});

			const result = await getWorkflowExamplesTool.invoke(
				{
					queries: [{ search: 'nonexistent workflow' }],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, 'No workflow examples found');
		});

		it('should handle partial failures when fetching individual templates', async () => {
			const mockConfig = createToolConfig('get_workflow_examples', 'test-call-5');

			// Mock returns 2 workflows (simulating one failed internally)
			mockFetchWorkflowsFromTemplates.mockResolvedValue(
				createMockFetchResult([
					createMockWorkflowMetadata('Workflow 1', 'Description 1', 2),
					createMockWorkflowMetadata('Workflow 3', 'Description 3', 3),
				]),
			);

			const result = await getWorkflowExamplesTool.invoke(
				{
					queries: [{ search: 'test' }],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			// Should return 2 successful workflows (ignoring the failed one)
			expectToolSuccess(content, 'Found 2 workflow example(s)');
			expect(message).toContain('Workflow 1');
			expect(message).toContain('Workflow 3');
		});

		it('should handle validation errors for empty queries array', async () => {
			const mockConfig = createToolConfig('get_workflow_examples', 'test-call-6');

			try {
				await getWorkflowExamplesTool.invoke(
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

		it('should handle network errors when fetching template list', async () => {
			const mockConfig = createToolConfig('get_workflow_examples', 'test-call-8');

			mockFetchWorkflowsFromTemplates.mockRejectedValue(new Error('Network error'));

			const result = await getWorkflowExamplesTool.invoke(
				{
					queries: [{ search: 'test' }],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			// Should return no results since the query failed
			expectToolSuccess(content, 'No workflow examples found');
		});

		it('should track batch progress for multiple queries', async () => {
			const mockConfig = createToolConfigWithWriter('get_workflow_examples', 'test-call-11');

			mockFetchWorkflowsFromTemplates
				.mockResolvedValueOnce(
					createMockFetchResult([createMockWorkflowMetadata('Workflow 1', 'Description 1', 2)]),
				)
				.mockResolvedValueOnce(
					createMockFetchResult([createMockWorkflowMetadata('Workflow 2', 'Description 2', 3)]),
				);

			await getWorkflowExamplesTool.invoke(
				{
					queries: [{ search: 'query1' }, { search: 'query2' }],
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
					(u) =>
						typeof u.data?.message === 'string' &&
						u.data.message.includes('Retrieving workflow examples'),
				),
			);
			expect(batchMessages.length).toBeGreaterThan(0);
		});

		it('should continue processing remaining queries if one fails', async () => {
			const mockConfig = createToolConfig('get_workflow_examples', 'test-call-13');

			// First query fails, second succeeds
			mockFetchWorkflowsFromTemplates
				.mockRejectedValueOnce(new Error('API error'))
				.mockResolvedValueOnce(
					createMockFetchResult([
						createMockWorkflowMetadata('Success Workflow', 'Success Description', 2),
					]),
				);

			const result = await getWorkflowExamplesTool.invoke(
				{
					queries: [{ search: 'failing query' }, { search: 'successful query' }],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			// Should return result from successful query
			expectToolSuccess(content, 'Found 1 workflow example(s)');
			expect(message).toContain('Success Workflow');
		});
	});
});
