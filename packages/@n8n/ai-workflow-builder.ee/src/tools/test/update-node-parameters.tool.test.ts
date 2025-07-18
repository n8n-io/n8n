import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import {
	createNode,
	createWorkflow,
	nodeTypes,
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	createToolConfig,
	setupWorkflowState,
	expectToolSuccess,
	expectToolError,
	expectNodeUpdated,
	buildUpdateNodeInput,
	mockParameterUpdaterChain,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createUpdateNodeParametersTool } from '../update-node-parameters.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

// Mock the parameter updater chain
jest.mock('../../../src/chains/parameter-updater', () => ({
	createParameterUpdaterChain: jest.fn(),
}));

describe('UpdateNodeParametersTool', () => {
	let nodeTypesList: INodeTypeDescription[];
	let updateNodeParametersTool: ReturnType<typeof createUpdateNodeParametersTool>;
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;
	let mockLLM: jest.Mocked<BaseChatModel>;
	let mockChain: ReturnType<typeof mockParameterUpdaterChain>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock LLM
		mockLLM = {
			invoke: jest.fn(),
		} as unknown as jest.Mocked<BaseChatModel>;

		// Setup mock parameter updater chain
		mockChain = mockParameterUpdaterChain();
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
		const parameterUpdaterModule = require('../../../src/chains/parameter-updater');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		parameterUpdaterModule.createParameterUpdaterChain.mockReturnValue(mockChain);

		nodeTypesList = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook, nodeTypes.setNode];
		updateNodeParametersTool = createUpdateNodeParametersTool(nodeTypesList, mockLLM);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should update node parameters successfully', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: {
						method: 'GET',
						url: 'https://example.com',
					},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain response
			mockChain.invoke.mockResolvedValue({
				parameters: {
					method: 'POST',
					url: 'https://api.example.com',
					headers: {
						pairs: [
							{
								name: 'Content-Type',
								value: 'application/json',
							},
						],
					},
				},
			});

			const mockConfig = createToolConfigWithWriter('update_node_parameters', 'test-call-1');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Change method to POST', 'Add Content-Type header']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeUpdated(content, 'node1', {
				parameters: expect.objectContaining({
					method: 'POST',
					url: 'https://api.example.com',
				}),
			});

			expectToolSuccess(
				content,
				'Successfully updated parameters for node "HTTP Request" (n8n-nodes-base.httpRequest):',
			);
			expect(content.update.messages[0]?.kwargs.content).toContain('- Change method to POST');
			expect(content.update.messages[0]?.kwargs.content).toContain('- Add Content-Type header');

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();
			expect(startMessage?.updates[0]?.data).toMatchObject({
				nodeId: 'node1',
				changes: ['Change method to POST', 'Add Content-Type header'],
			});

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
			expect(completeMessage?.updates[0]?.data).toMatchObject({
				nodeId: 'node1',
				nodeName: 'HTTP Request',
				nodeType: 'n8n-nodes-base.httpRequest',
				appliedChanges: ['Change method to POST', 'Add Content-Type header'],
			});
		});

		it('should handle expression parameters correctly', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					parameters: {},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain response with expression
			mockChain.invoke.mockResolvedValue({
				parameters: {
					values: {
						// eslint-disable-next-line id-denylist
						string: [
							{
								name: 'status',
								value: '={{ $json.response.status }}',
							},
						],
					},
				},
			});

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-2');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Set status field from response']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeUpdated(content, 'node1', {
				parameters: expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					values: expect.objectContaining({
						// eslint-disable-next-line id-denylist, @typescript-eslint/no-unsafe-assignment
						string: expect.arrayContaining([
							expect.objectContaining({
								name: 'status',
								value: '={{ $json.response.status }}',
							}),
						]),
					}),
				}),
			});
		});

		it('should merge parameters instead of replacing them', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: {
						method: 'GET',
						url: 'https://example.com',
						authentication: 'genericCredentialType',
						genericAuthType: 'httpBasicAuth',
					},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain response - only updating URL
			mockChain.invoke.mockResolvedValue({
				parameters: {
					url: 'https://api.example.com/v2',
				},
			});

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-3');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Update URL to v2 endpoint']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			// Should keep existing parameters and only update URL
			expectNodeUpdated(content, 'node1', {
				parameters: expect.objectContaining({
					method: 'GET', // preserved
					url: 'https://api.example.com/v2', // updated
					authentication: 'genericCredentialType', // preserved
					genericAuthType: 'httpBasicAuth', // preserved
				}),
			});
		});

		it('should handle non-existent node', async () => {
			const existingWorkflow = createWorkflow([createNode({ id: 'node1', name: 'Code' })]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-4');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('non-existent', ['Some change']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node with ID "non-existent" not found in workflow');
		});

		it('should handle unknown node type', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Unknown', type: 'unknown.type' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-5');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Some change']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node type "unknown.type" not found');
		});

		it('should handle LLM returning invalid parameters', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain returning invalid response
			mockChain.invoke.mockResolvedValue({ parameters: null } as unknown as {
				parameters: Record<string, unknown>;
			});

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-6');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Add code']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Invalid parameters structure returned from LLM');
		});

		it('should handle validation errors', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-7');

			try {
				await updateNodeParametersTool.invoke(
					{
						nodeId: 'node1',
						// Missing changes array
					} as Parameters<typeof updateNodeParametersTool.invoke>[0],
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle empty changes array', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-8');

			try {
				await updateNodeParametersTool.invoke(
					{
						nodeId: 'node1',
						changes: [],
					},
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should fix expression prefixes', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					parameters: {},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain response with missing = prefix
			mockChain.invoke.mockResolvedValue({
				parameters: {
					values: {
						// eslint-disable-next-line id-denylist
						string: [
							{
								name: 'value',
								value: '{{ $json.data }}', // Missing = prefix
							},
						],
					},
				},
			});

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-9');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Add value from data']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			// Should fix the expression prefix
			expectNodeUpdated(content, 'node1', {
				parameters: expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					values: expect.objectContaining({
						// eslint-disable-next-line id-denylist, @typescript-eslint/no-unsafe-assignment
						string: expect.arrayContaining([
							expect.objectContaining({
								name: 'value',
								value: '={{ $json.data }}', // Fixed with = prefix
							}),
						]),
					}),
				}),
			});
		});

		it('should handle complex nested parameters', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: {
						method: 'POST',
						url: 'https://api.example.com',
					},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock complex nested response
			mockChain.invoke.mockResolvedValue({
				parameters: {
					method: 'POST',
					url: 'https://api.example.com',
					headers: {
						pairs: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.apiKey}}',
							},
							{
								name: 'X-Custom-Header',
								value: '={{ $node["Webhook"].json.customValue }}',
							},
						],
					},
					body: {
						contentType: 'json',
						jsonBody: '={{ JSON.stringify({\n  "user": $json.user,\n  "action": "update"\n}) }}',
					},
				},
			});

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-10');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', [
					'Add authorization header with API key',
					'Add custom header from webhook',
					'Set JSON body with user data',
				]),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, 'Successfully updated parameters');
			const updatedNode = content.update.workflowOperations?.[0]?.updates as Partial<INode>;
			// Type-safe access to nested properties
			const headers = updatedNode?.parameters?.headers as { pairs?: unknown[] } | undefined;
			const body = updatedNode?.parameters?.body as { contentType?: string } | undefined;
			expect(headers?.pairs).toHaveLength(2);
			expect(body?.contentType).toBe('json');
		});

		it('should handle parameters validation gracefully', async () => {
			// Create a custom node type with a required parameter
			const customNodeType = {
				...nodeTypes.httpRequest,
				properties: [
					{
						displayName: 'URL',
						name: 'url',
						type: 'string' as const,
						required: true,
						default: '', // Empty default, so it's truly required
					},
					{
						displayName: 'Method',
						name: 'method',
						type: 'options' as const,
						options: [
							{ name: 'GET', value: 'GET' },
							{ name: 'POST', value: 'POST' },
						],
						default: 'GET',
					},
				],
			};

			// Create tool with custom node type
			const customTool = createUpdateNodeParametersTool([customNodeType], mockLLM);

			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: { url: 'https://example.com' }, // Has URL initially
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock response that removes the required URL parameter
			mockChain.invoke.mockResolvedValue({
				parameters: {
					method: 'POST',
					// URL will be removed during merge, making it invalid
					url: '', // Empty string for required field
				},
			});

			const mockConfig = createToolConfigWithWriter('update_node_parameters', 'test-call-11');

			const result = await customTool.invoke(
				buildUpdateNodeInput('node1', ['Change method to POST and clear URL']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			// Should still succeed even with validation issues
			expectToolSuccess(content, 'Successfully updated parameters');

			// The parameter update should still happen
			expectNodeUpdated(content, 'node1', {
				parameters: expect.objectContaining({
					method: 'POST',
				}),
			});
		});

		it('should handle LLM chain errors gracefully', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain throwing error
			mockChain.invoke.mockRejectedValue(new Error('LLM service unavailable'));

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-12');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Add JavaScript code']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Failed to update node parameters: LLM service unavailable');
		});

		it('should handle "Received tool input did not match expected schema" error from parametersChain', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: {
						method: 'GET',
						url: 'https://example.com',
					},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain throwing schema validation error
			const schemaError = new Error('Received tool input did not match expected schema');
			mockChain.invoke.mockRejectedValue(schemaError);

			const mockConfig = createToolConfigWithWriter(
				'update_node_parameters',
				'test-call-schema-error',
			);

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', ['Change method to POST']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			// The error should be wrapped as a ToolExecutionError
			expectToolError(
				content,
				'Error: Failed to update node parameters: Received tool input did not match expected schema',
			);

			// Verify the error was passed through the reporter
			const progressCalls = extractProgressMessages(mockConfig.writer);
			const errorMessage = findProgressMessage(progressCalls, 'error');
			expect(errorMessage).toBeDefined();
			expect(errorMessage?.updates[0]?.type).toBe('error');
		});

		it('should pass correct context to parameter updater chain', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'test-node',
					name: 'My HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: {
						method: 'GET',
						url: 'https://old.example.com',
					},
				}),
			]);
			const mockState = {
				prompt: 'Test workflow prompt',
				executionData: { test: 'data' },
			};
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: existingWorkflow,
				...mockState,
			});

			mockChain.invoke.mockResolvedValue({
				parameters: { url: 'https://new.example.com' },
			});

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-13');

			await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('test-node', ['Update URL']),
				mockConfig,
			);

			// Verify chain was called with correct context

			expect(mockChain.invoke).toHaveBeenCalledWith(
				expect.objectContaining({
					execution_data: 'NO EXECUTION DATA YET',
					execution_schema: 'NO SCHEMA',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					workflow_json: expect.objectContaining({
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						nodes: expect.arrayContaining([
							expect.objectContaining({
								id: 'test-node',
							}),
						]),
					}),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					node_definition: expect.any(String),
					node_id: 'test-node',
					node_name: 'My HTTP Request',
					node_type: 'n8n-nodes-base.httpRequest',
					current_parameters: JSON.stringify(
						{
							method: 'GET',
							url: 'https://old.example.com',
						},
						null,
						2,
					),
					changes: '1. Update URL',
				}),
			);

			// Verify createParameterUpdaterChain was called with correct config
			// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
			const paramUpdaterModule = require('../../../src/chains/parameter-updater');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(paramUpdaterModule.createParameterUpdaterChain).toHaveBeenCalledWith(
				mockLLM,

				expect.objectContaining({
					nodeType: 'n8n-nodes-base.httpRequest',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					nodeDefinition: expect.any(Object),
					requestedChanges: ['Update URL'],
				}),

				undefined, // Logger
			);
		});

		it('should handle webhook node parameters', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'webhook1',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					parameters: {
						path: 'webhook',
					},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain response
			mockChain.invoke.mockResolvedValue({
				parameters: {
					path: 'api/v2/webhook',
					httpMethod: 'POST',
					responseMode: 'onReceived',
				},
			});

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-14');

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('webhook1', ['Change path to api/v2/webhook', 'Accept POST requests']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeUpdated(content, 'webhook1', {
				parameters: expect.objectContaining({
					path: 'api/v2/webhook',
					httpMethod: 'POST',
					responseMode: 'onReceived',
				}),
			});
		});

		it('should format multiple changes correctly', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			mockChain.invoke.mockResolvedValue({ parameters: { jsCode: 'console.log("test");' } });

			const mockConfig = createToolConfig('update_node_parameters', 'test-call-15');

			const changes = ['Add console log statement', 'Log the word "test"', 'Use JavaScript syntax'];

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('node1', changes),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Successfully updated parameters');
			// Check all changes are listed
			expect(message).toContain('- Add console log statement');
			expect(message).toContain('- Log the word "test"');
			expect(message).toContain('- Use JavaScript syntax');
		});

		it('should properly wrap chain schema errors as ToolExecutionError', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'test-node',
					name: 'Set Node',
					type: 'n8n-nodes-base.set',
					parameters: {},
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			// Mock chain throwing a detailed schema validation error
			const schemaError = new Error(
				'Received tool input did not match expected schema: Invalid parameters structure',
			);
			mockChain.invoke.mockRejectedValue(schemaError);

			const mockConfig = createToolConfigWithWriter(
				'update_node_parameters',
				'test-schema-validation',
			);

			const result = await updateNodeParametersTool.invoke(
				buildUpdateNodeInput('test-node', ['Add field mapping']),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			// Check that the error is properly formatted
			expectToolError(
				content,
				/Failed to update node parameters.*Received tool input did not match expected schema/,
			);

			// Verify the error reporter received a ToolExecutionError
			const progressCalls = extractProgressMessages(mockConfig.writer);
			const errorCall = progressCalls.find((call) => call.status === 'error');
			expect(errorCall).toBeDefined();

			// The error should be a ToolExecutionError with proper metadata
			const errorData = errorCall?.updates[0]?.data;
			expect(errorData).toBeDefined();
			// Since the error is converted to a plain object for reporting, check the message
			expect(JSON.stringify(errorData)).toContain('Failed to update node parameters');
			expect(JSON.stringify(errorData)).toContain(
				'Received tool input did not match expected schema',
			);
		});
	});
});
