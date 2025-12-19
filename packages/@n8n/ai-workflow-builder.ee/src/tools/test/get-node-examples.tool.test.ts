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
import {
	createGetNodeConfigurationExamplesTool,
	createGetNodeConnectionExamplesTool,
} from '../get-node-examples.tool';
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

const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
	typeof getCurrentTaskInput
>;
const mockFetchWorkflowsFromTemplates =
	templates.fetchWorkflowsFromTemplates as jest.MockedFunction<
		typeof templates.fetchWorkflowsFromTemplates
	>;

describe('GetNodeExamplesTool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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

	describe('configuration examples', () => {
		let configTool: ReturnType<typeof createGetNodeConfigurationExamplesTool>['tool'];

		beforeEach(() => {
			configTool = createGetNodeConfigurationExamplesTool().tool;
		});

		it('should fetch configuration examples from API', async () => {
			const mockConfig = createToolConfig('get_node_configuration_examples', 'test-1');

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

			const result = await configTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.httpRequest' }] },
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
			const mockConfig = createToolConfig('get_node_configuration_examples', 'test-2');

			// Set up cached templates
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

			const result = await configTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.code' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Node Configuration Examples');
			expect(message).toContain('return items;');
			// Should NOT call API since we found cached data
			expect(mockFetchWorkflowsFromTemplates).not.toHaveBeenCalled();
		});

		it('should filter by node version when specified', async () => {
			const mockConfig = createToolConfig('get_node_configuration_examples', 'test-3');

			mockFetchWorkflowsFromTemplates.mockResolvedValue(
				createMockFetchResult([
					createMockWorkflow('Multi-version Workflow', [
						createNode({
							id: 'http-v1',
							name: 'HTTP V1',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							parameters: { url: 'https://v1.example.com' },
						}),
						createNode({
							id: 'http-v2',
							name: 'HTTP V2',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 2,
							parameters: { url: 'https://v2.example.com' },
						}),
					]),
				]),
			);

			const result = await configTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.httpRequest', nodeVersion: 2 }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Node Configuration Examples');
			expect(message).toContain('https://v2.example.com');
			expect(message).not.toContain('https://v1.example.com');
		});

		it('should return no examples message when node not found', async () => {
			const mockConfig = createToolConfig('get_node_configuration_examples', 'test-4');

			mockFetchWorkflowsFromTemplates.mockResolvedValue(createMockFetchResult([]));

			const result = await configTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.unknownNode' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'No examples found');
			expect(message).toContain('unknownNode');
		});
	});

	describe('connection examples', () => {
		let connectionTool: ReturnType<typeof createGetNodeConnectionExamplesTool>['tool'];

		beforeEach(() => {
			connectionTool = createGetNodeConnectionExamplesTool().tool;
		});

		it('should fetch connection examples with mermaid diagrams', async () => {
			const mockConfig = createToolConfig('get_node_connection_examples', 'test-5');

			mockFetchWorkflowsFromTemplates.mockResolvedValue(
				createMockFetchResult([
					createMockWorkflow(
						'Loop Workflow',
						[
							createNode({ id: 'trigger', name: 'Start', type: 'n8n-nodes-base.manualTrigger' }),
							createNode({
								id: 'split',
								name: 'Split Batches',
								type: 'n8n-nodes-base.splitInBatches',
							}),
							createNode({ id: 'http', name: 'Process', type: 'n8n-nodes-base.httpRequest' }),
						],
						{
							Start: { main: [[{ node: 'Split Batches', type: 'main', index: 0 }]] },
							'Split Batches': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
						},
					),
				]),
			);

			const result = await connectionTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.splitInBatches' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Node Connection Examples');
			expect(message).toContain('```mermaid');
			expect(message).toContain('flowchart TD');
			expect(message).toContain('splitInBatches');
		});

		it('should use cached templates for connection examples', async () => {
			const mockConfig = createToolConfig('get_node_connection_examples', 'test-6');

			mockGetCurrentTaskInput.mockReturnValue({
				cachedTemplates: [
					createMockWorkflow('Cached Connection', [
						createNode({ id: 'if', name: 'Check', type: 'n8n-nodes-base.if' }),
						createNode({ id: 'code', name: 'Process', type: 'n8n-nodes-base.code' }),
					]),
				],
				workflowJSON: { nodes: [], connections: {}, name: 'Test' },
				messages: [],
			});

			const result = await connectionTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.if' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Node Connection Examples');
			expect(message).toContain('```mermaid');
			expect(mockFetchWorkflowsFromTemplates).not.toHaveBeenCalled();
		});

		it('should return no examples message when no workflows found', async () => {
			const mockConfig = createToolConfig('get_node_connection_examples', 'test-7');

			mockFetchWorkflowsFromTemplates.mockResolvedValue(createMockFetchResult([]));

			const result = await connectionTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.unknownNode' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, 'No connection examples found');
		});
	});

	describe('batch processing with local cache', () => {
		it('should use templates from earlier fetches for subsequent nodes in same batch', async () => {
			const configTool = createGetNodeConfigurationExamplesTool().tool;
			const mockConfig = createToolConfig('get_node_configuration_examples', 'test-batch');

			// First fetch returns a workflow containing BOTH httpRequest AND code nodes
			mockFetchWorkflowsFromTemplates.mockResolvedValueOnce(
				createMockFetchResult([
					createMockWorkflow('Multi-Node Workflow', [
						createNode({
							id: 'http-1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							parameters: { url: 'https://api.example.com' },
						}),
						createNode({
							id: 'code-1',
							name: 'Transform',
							type: 'n8n-nodes-base.code',
							typeVersion: 1,
							parameters: { jsCode: 'return items.map(i => i);' },
						}),
					]),
				]),
			);

			// Request examples for both nodes in one call
			const result = await configTool.invoke(
				{
					nodes: [{ nodeType: 'n8n-nodes-base.httpRequest' }, { nodeType: 'n8n-nodes-base.code' }],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Node Configuration Examples');
			// Should contain examples for both nodes
			expect(message).toContain('httpRequest');
			expect(message).toContain('https://api.example.com');
			expect(message).toContain('code');
			expect(message).toContain('return items.map');

			// API should only be called ONCE - second node should use local cache
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledTimes(1);
		});
	});

	describe('state updates', () => {
		// Extended type for state updates that include cachedTemplates
		interface ParsedToolContentWithState extends ParsedToolContent {
			update: ParsedToolContent['update'] & {
				cachedTemplates?: WorkflowMetadata[];
			};
		}

		it('should cache new templates in state when fetched from API', async () => {
			const configTool = createGetNodeConfigurationExamplesTool().tool;
			const mockConfig = createToolConfig('get_node_configuration_examples', 'test-8');

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

			const result = await configTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.set' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContentWithState>(result);

			expectToolSuccess(content, 'Node Configuration Examples');
			// Verify state update includes cached templates
			expect(content.update.cachedTemplates).toEqual(fetchedWorkflows);
		});

		it('should not update state when using cached templates', async () => {
			const configTool = createGetNodeConfigurationExamplesTool().tool;
			const mockConfig = createToolConfig('get_node_configuration_examples', 'test-9');

			mockGetCurrentTaskInput.mockReturnValue({
				cachedTemplates: [
					createMockWorkflow('Already Cached', [
						createNode({ id: 'merge', name: 'Merge', type: 'n8n-nodes-base.merge' }),
					]),
				],
				workflowJSON: { nodes: [], connections: {}, name: 'Test' },
				messages: [],
			});

			const result = await configTool.invoke(
				{ nodes: [{ nodeType: 'n8n-nodes-base.merge' }] },
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContentWithState>(result);

			expectToolSuccess(content, 'Node Configuration Examples');
			// No cachedTemplates in state update since we used existing cache
			expect(content.update.cachedTemplates).toBeUndefined();
		});
	});
});
