import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getConnectedTools } from '@utils/helpers';
import { pollUntilAvailable } from '../../../../helpers/polling';
import * as transport from '../../../../transport';
import * as helpers from '../../../../v2/actions/text/helpers/responses';
import { execute } from '../../../../v2/actions/text/response.operation';
import { formatToOpenAIResponsesTool } from '../../../../helpers/utils';
import type { Tool } from 'langchain/tools';

jest.mock('../../../../transport');
jest.mock('../../../../v2/actions/text/helpers/responses');
jest.mock('@utils/helpers');
jest.mock('../../../../helpers/polling');
jest.mock('../../../../helpers/utils');

const mockFormatToOpenAIResponsesTool = formatToOpenAIResponsesTool as jest.MockedFunction<
	typeof formatToOpenAIResponsesTool
>;
const mockApiRequest = transport.apiRequest as jest.MockedFunction<typeof transport.apiRequest>;
const mockCreateRequest = helpers.createRequest as jest.MockedFunction<
	typeof helpers.createRequest
>;
const mockGetConnectedTools = getConnectedTools as jest.MockedFunction<typeof getConnectedTools>;
const mockPollUntilAvailable = pollUntilAvailable as jest.MockedFunction<typeof pollUntilAvailable>;

describe('OpenAI Response Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: jest.Mocked<INode>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-langchain.openAi',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex: number, defaultValue?: unknown) => {
				const mockParams: Record<string, unknown> = {
					modelId: 'gpt-4o',
					'responses.values': [
						{
							role: 'user',
							type: 'text',
							content: 'Hello, how are you?',
						},
					],
					options: {},
					builtInTools: {},
					simplify: false,
					hideTools: 'show',
					'options.maxToolsIterations': 15,
				};
				return (mockParams[param] ?? defaultValue) as any;
			},
		);

		mockFormatToOpenAIResponsesTool.mockImplementation((tool: Tool) => {
			return {
				type: 'function',
				name: tool.name,
				parameters: {},
				strict: false,
				description: tool.description,
			};
		});
	});

	describe('Successful Execution', () => {
		it('should execute successfully with basic text message', async () => {
			const mockResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [
							{
								type: 'output_text',
								text: 'I am doing well, thank you for asking!',
							},
						],
					},
				],
			};

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [{ role: 'user', content: [{ type: 'input_text', text: 'Hello, how are you?' }] }],
			});
			mockApiRequest.mockResolvedValue(mockResponse);
			mockGetConnectedTools.mockResolvedValue([]);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.any(Object),
			});
		});

		it('should execute with simplified output enabled', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'simplify') return true;
				return 'default';
			});

			const mockResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'reasoning',
						role: 'assistant',
						content: [{ type: 'some_reasoning_output', text: 'Response text' }],
					},
					{
						type: 'tool_call',
						role: 'assistant',
						content: [{ type: 'some_tool_call_output', text: 'Response text' }],
					},
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Response text' }],
					},
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Response text 2' }],
					},
				],
			};

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
			});
			mockApiRequest.mockResolvedValue(mockResponse);
			mockGetConnectedTools.mockResolvedValue([]);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: {
						output: [
							{
								type: 'message',
								role: 'assistant',
								content: [{ type: 'output_text', text: 'Response text' }],
							},
							{
								type: 'message',
								role: 'assistant',
								content: [{ type: 'output_text', text: 'Response text 2' }],
							},
						],
					},
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('Background Mode', () => {
		it('should handle background mode execution with polling', async () => {
			const initialResponse = {
				id: 'resp_123',
				status: 'in_progress',
				output: [],
			};

			const completedResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Background response' }],
					},
				],
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'options.backgroundMode.values.enabled') return true;
				if (param === 'options.backgroundMode.values.timeout') return 300;
				if (param === 'simplify') return false;
				return 'default';
			});

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				background: true,
			});
			mockApiRequest.mockResolvedValueOnce(initialResponse);
			mockPollUntilAvailable.mockResolvedValue(completedResponse);
			mockGetConnectedTools.mockResolvedValue([]);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockPollUntilAvailable).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.any(Function),
				expect.any(Function),
				300,
				10,
			);
			expect(result).toEqual([
				{
					json: completedResponse,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should throw error when background mode fails', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'options.backgroundMode.values.enabled') return true;
				if (param === 'simplify') return false;
				return 'default';
			});

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				background: true,
			});
			mockApiRequest.mockResolvedValueOnce({ id: 'resp_123', status: 'in_progress' });
			mockPollUntilAvailable.mockImplementation(async (context, pollFn, checkFn) => {
				const response = await pollFn();
				if (checkFn(response)) {
					throw new NodeOperationError(context.getNode(), 'Background mode error', {
						description: 'Background processing failed',
					});
				}
				return response;
			});

			await expect(execute.call(mockExecuteFunctions, 0)).rejects.toThrow(NodeOperationError);
		});
	});

	describe('Tool Calls', () => {
		it('should execute tool calls with external tools', async () => {
			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue('Tool response'),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			const initialResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ input: 'test input' }),
					},
				],
			};

			const finalResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Final response' }],
					},
				],
			};

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
			});
			mockApiRequest.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(finalResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockTool.invoke).toHaveBeenCalledWith('test input');
			expect(mockApiRequest).toHaveBeenCalledTimes(2);
			expect(result).toEqual([
				{
					json: finalResponse,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle tool call with object response', async () => {
			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue({ result: 'success', data: 'test data' }),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			const initialResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ data: 'test input' }),
					},
				],
			};

			const finalResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Final response' }],
					},
				],
			};

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
			});
			mockApiRequest.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(finalResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockTool.invoke).toHaveBeenCalledWith({ data: 'test input' });
		});

		it('should respect max tool iterations limit', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'options.maxToolsIterations') return 2;
				return 'default';
			});

			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue('Tool response'),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			const responseWithToolCalls = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ input: 'test input' }),
					},
				],
			};

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
			});
			mockApiRequest.mockResolvedValue(responseWithToolCalls);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledTimes(3); // Initial + 2 iterations
		});

		it('should handle abort signal during tool calls', async () => {
			const abortController = new AbortController();
			abortController.abort();

			mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(abortController.signal);

			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue('Tool response'),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			const responseWithToolCalls = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ input: 'test input' }),
					},
				],
			};

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
			});
			mockApiRequest.mockResolvedValue(responseWithToolCalls);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledTimes(1); // Only initial call
		});

		it('should handle reasoning models with reasoning items in tool calls', async () => {
			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue('Tool response'),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			const initialResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'reasoning',
						content: 'I need to use the test tool to get information',
					},
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ input: 'test input' }),
					},
				],
			};

			const finalResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Final response' }],
					},
				],
			};

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
			});
			mockApiRequest.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(finalResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockTool.invoke).toHaveBeenCalledWith('test input');
			expect(mockApiRequest).toHaveBeenCalledTimes(2);
			expect(mockApiRequest).toHaveBeenNthCalledWith(2, 'POST', '/responses', {
				body: {
					model: 'gpt-4o',
					input: [
						{
							type: 'reasoning',
							content: 'I need to use the test tool to get information',
						},
						{
							type: 'function_call',
							call_id: 'call_123',
							name: 'test_tool',
							arguments: JSON.stringify({ input: 'test input' }),
						},
						{
							call_id: 'call_123',
							output: 'Tool response',
							type: 'function_call_output',
						},
					],
					tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
				},
			});
			expect(result).toEqual([
				{
					json: finalResponse,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should not include function_call or reasoning items in the request if there is a conversation', async () => {
			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue('Tool response'),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			const initialResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'reasoning',
						content: 'I need to use the test tool to get information',
					},
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ input: 'test input' }),
					},
				],
			};

			const finalResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Final response' }],
					},
				],
			};

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
				conversation: 'conv_123',
			});
			mockApiRequest.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(finalResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockTool.invoke).toHaveBeenCalledWith('test input');
			expect(mockApiRequest).toHaveBeenCalledTimes(2);
			expect(mockApiRequest).toHaveBeenNthCalledWith(2, 'POST', '/responses', {
				body: {
					model: 'gpt-4o',
					input: [
						{
							call_id: 'call_123',
							output: 'Tool response',
							type: 'function_call_output',
						},
					],
					tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
					conversation: 'conv_123',
				},
			});
			expect(result).toEqual([
				{
					json: finalResponse,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle reasoning models with only reasoning items (no function calls)', async () => {
			const responseWithOnlyReasoning = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'reasoning',
						content: 'I am thinking about this problem',
					},
					{
						type: 'reasoning',
						content: 'I have reached a conclusion',
					},
				],
			};

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
			});
			mockApiRequest.mockResolvedValue(responseWithOnlyReasoning);
			mockGetConnectedTools.mockResolvedValue([]);

			const result = await execute.call(mockExecuteFunctions, 0);

			// Should not make additional API calls since there are no function calls
			expect(mockApiRequest).toHaveBeenCalledTimes(1);
			expect(result).toEqual([
				{
					json: responseWithOnlyReasoning,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('JSON Format Handling', () => {
		it('should handle JSON parsing errors gracefully', async () => {
			const mockResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [
							{
								type: 'output_text',
								text: 'invalid json',
							},
						],
					},
				],
			};

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				text: { format: { type: 'json_object' } },
			});
			mockApiRequest.mockResolvedValue(mockResponse);
			mockGetConnectedTools.mockResolvedValue([]);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty messages array', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'responses.values') return [];
				if (param === 'simplify') return false;
				return 'default';
			});

			const mockResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [],
			};

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
			});
			mockApiRequest.mockResolvedValue(mockResponse);
			mockGetConnectedTools.mockResolvedValue([]);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: {
						id: 'resp_123',
						status: 'completed',
						output: [],
					},
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle tools hidden for unsupported models', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'hideTools') return 'hide';
				if (param === 'simplify') return false;
				return 'default';
			});

			const mockResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Response without tools' }],
					},
				],
			};

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
			});
			mockApiRequest.mockResolvedValue(mockResponse);
			mockGetConnectedTools.mockResolvedValue([]);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockGetConnectedTools).not.toHaveBeenCalled();
			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle non-function-call items in output', async () => {
			const mockResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Regular message' }],
					},
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ input: 'test input' }),
					},
				],
			};

			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue('Tool response'),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: false }],
			});
			mockApiRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce({
				...mockResponse,
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Final response' }],
					},
				],
			});

			await execute.call(mockExecuteFunctions, 0);

			expect(mockTool.invoke).toHaveBeenCalledTimes(1);
		});

		it('should use dynamic strict parameter calculation for tools', async () => {
			const mockTool = {
				name: 'test_tool',
				invoke: jest.fn().mockResolvedValue('Tool response'),
				schema: {
					typeName: 'ZodObject',
					_def: { typeName: 'ZodObject', shape: () => ({}) },
					parse: jest.fn(),
					safeParse: jest.fn(),
				},
				call: jest.fn(),
				description: 'Test tool',
				returnDirect: false,
			} as any;

			// Mock the formatToOpenAIResponsesTool to return different strict values
			mockFormatToOpenAIResponsesTool.mockImplementation((tool: Tool) => {
				return {
					type: 'function',
					name: tool.name,
					parameters: {
						type: 'object',
						properties: { input: { type: 'string' } },
						required: ['input'],
					},
					strict: true, // This should be calculated dynamically based on schema
					description: tool.description,
				};
			});

			const responseWithToolCalls = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'function_call',
						call_id: 'call_123',
						name: 'test_tool',
						arguments: JSON.stringify({ input: 'test input' }),
					},
				],
			};

			const finalResponse = {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Final response' }],
					},
				],
			};

			mockGetConnectedTools.mockResolvedValue([mockTool]);
			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
				tools: [{ name: 'test_tool', type: 'function', parameters: {}, strict: true }],
			});
			mockApiRequest
				.mockResolvedValueOnce(responseWithToolCalls)
				.mockResolvedValueOnce(finalResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockFormatToOpenAIResponsesTool).toHaveBeenCalledWith(
				mockTool,
				expect.anything(),
				expect.anything(),
			);
			expect(mockTool.invoke).toHaveBeenCalledWith('test input');
		});
	});

	describe('Parameter Handling', () => {
		it('should pass correct parameters to createRequest', async () => {
			const mockMessages = [
				{
					role: 'user',
					type: 'text',
					content: 'Test message',
				},
			];

			const mockOptions = {
				maxTokens: 100,
				temperature: 0.7,
			};

			const mockBuiltInTools = {
				webSearch: { searchContextSize: 'high' },
			};

			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'modelId') return 'gpt-4o';
				if (param === 'responses.values') return mockMessages;
				if (param === 'options') return mockOptions;
				if (param === 'builtInTools') return mockBuiltInTools;
				return 'default';
			});

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
			});
			mockApiRequest.mockResolvedValue({
				id: 'resp_123',
				status: 'completed',
				output: [],
			});
			mockGetConnectedTools.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockCreateRequest).toHaveBeenCalledWith(0, {
				model: 'gpt-4o',
				messages: mockMessages,
				options: mockOptions,
				tools: undefined,
				builtInTools: mockBuiltInTools,
			});
		});

		it('should handle default values for optional parameters', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _itemIndex: number, defaultValue?: unknown) => {
					if (param === 'modelId') return 'gpt-4o';
					if (param === 'responses.values') return [];
					if (param === 'options') return {};
					if (param === 'builtInTools') return {};
					return defaultValue as any;
				},
			);

			mockCreateRequest.mockResolvedValue({
				model: 'gpt-4o',
				input: [],
			});
			mockApiRequest.mockResolvedValue({
				id: 'resp_123',
				status: 'completed',
				output: [],
			});
			mockGetConnectedTools.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockCreateRequest).toHaveBeenCalledWith(0, {
				model: 'gpt-4o',
				messages: [],
				options: {},
				tools: undefined,
				builtInTools: {},
			});
		});
	});
});
