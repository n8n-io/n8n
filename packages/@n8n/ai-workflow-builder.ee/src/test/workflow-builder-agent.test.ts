/* eslint-disable @typescript-eslint/require-await */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { MemorySaver } from '@langchain/langgraph';
import { GraphRecursionError } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

jest.mock('@/tools/add-node.tool', () => ({
	createAddNodeTool: jest.fn().mockReturnValue({ tool: { name: 'add_node' } }),
}));
jest.mock('@/tools/connect-nodes.tool', () => ({
	createConnectNodesTool: jest.fn().mockReturnValue({ tool: { name: 'connect_nodes' } }),
}));
jest.mock('@/tools/node-details.tool', () => ({
	createNodeDetailsTool: jest.fn().mockReturnValue({ tool: { name: 'node_details' } }),
}));
jest.mock('@/tools/node-search.tool', () => ({
	createNodeSearchTool: jest.fn().mockReturnValue({ tool: { name: 'node_search' } }),
}));
jest.mock('@/tools/remove-node.tool', () => ({
	createRemoveNodeTool: jest.fn().mockReturnValue({ tool: { name: 'remove_node' } }),
}));
jest.mock('@/tools/update-node-parameters.tool', () => ({
	createUpdateNodeParametersTool: jest
		.fn()
		.mockReturnValue({ tool: { name: 'update_node_parameters' } }),
}));
jest.mock('@/tools/get-node-parameter.tool', () => ({
	createGetNodeParameterTool: jest.fn().mockReturnValue({ tool: { name: 'get_node_parameter' } }),
}));

jest.mock('@/utils/stream-processor', () => ({
	createStreamProcessor: jest.fn(),
	formatMessages: jest.fn(),
}));

const mockRandomUUID = jest.fn();
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: mockRandomUUID,
	},
	writable: true,
});

import { MAX_AI_BUILDER_PROMPT_LENGTH } from '@/constants';
import { ValidationError } from '@/errors';
import type { StreamOutput } from '@/types/streaming';
import { createStreamProcessor } from '@/utils/stream-processor';
import {
	WorkflowBuilderAgent,
	type WorkflowBuilderAgentConfig,
	type ChatPayload,
} from '@/workflow-builder-agent';

describe('WorkflowBuilderAgent', () => {
	let agent: WorkflowBuilderAgent;
	let mockLlm: BaseChatModel;
	let mockLogger: Logger;
	let mockCheckpointer: MemorySaver;
	let parsedNodeTypes: INodeTypeDescription[];
	let config: WorkflowBuilderAgentConfig;

	const mockCreateStreamProcessor = createStreamProcessor as jest.MockedFunction<
		typeof createStreamProcessor
	>;

	beforeEach(() => {
		mockLlm = mock<BaseChatModel>({
			_llmType: jest.fn().mockReturnValue('test-llm'),
			bindTools: jest.fn().mockReturnThis(),
			invoke: jest.fn(),
		});

		mockLogger = mock<Logger>({
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		});

		mockCheckpointer = mock<MemorySaver>();
		mockCheckpointer.getTuple = jest.fn();
		mockCheckpointer.put = jest.fn();
		mockCheckpointer.list = jest.fn();

		parsedNodeTypes = [
			{
				name: 'TestNode',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [],
				group: ['transform'],
			} as INodeTypeDescription,
		];

		config = {
			parsedNodeTypes,
			stageLLMs: {
				supervisor: mockLlm,
				responder: mockLlm,
				discovery: mockLlm,
				builder: mockLlm,
				configurator: mockLlm,
				parameterUpdater: mockLlm,
			},
			logger: mockLogger,
			checkpointer: mockCheckpointer,
		};

		agent = new WorkflowBuilderAgent(config);
	});

	describe('chat method', () => {
		let mockPayload: ChatPayload;

		beforeEach(() => {
			mockPayload = {
				id: '12345',
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'workflow-123' },
				},
			};
		});

		it('should throw ValidationError when message exceeds maximum length', async () => {
			const longMessage = 'x'.repeat(MAX_AI_BUILDER_PROMPT_LENGTH + 1);
			const payload: ChatPayload = {
				id: '12345',
				message: longMessage,
			};

			await expect(async () => {
				const generator = agent.chat(payload);
				await generator.next();
			}).rejects.toThrow(ValidationError);

			expect(mockLogger.warn).toHaveBeenCalledWith('Message exceeds maximum length', {
				messageLength: longMessage.length,
				maxLength: MAX_AI_BUILDER_PROMPT_LENGTH,
			});
		});

		it('should handle valid message length', async () => {
			const validMessage = 'Create a simple workflow';
			const payload: ChatPayload = {
				id: '12345',
				message: validMessage,
			};

			// Mock the stream processing to return a proper StreamOutput
			const mockStreamOutput: StreamOutput = {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: 'Processing...',
					},
				],
			};
			const mockAsyncGenerator = (async function* () {
				yield mockStreamOutput;
			})();

			mockCreateStreamProcessor.mockReturnValue(mockAsyncGenerator);

			// Mock the LLM to return a simple response
			(mockLlm.invoke as jest.Mock).mockResolvedValue({
				content: 'Mocked response',
				tool_calls: [],
			});

			const generator = agent.chat(payload);
			const result = await generator.next();

			expect(result.value).toEqual(mockStreamOutput);
		});

		it('should handle GraphRecursionError', async () => {
			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw new GraphRecursionError('Recursion limit exceeded');
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ApplicationError);
		});

		it('should handle 401 expired token error from LangChain MODEL_AUTHENTICATION', async () => {
			// This matches the actual error structure from LangChain when the AI assistant proxy token expires
			const expiredTokenError = Object.assign(new Error('Expired token'), {
				status: 401,
				lc_error_code: 'MODEL_AUTHENTICATION',
			});

			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw expiredTokenError;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ApplicationError);
		});

		it('should not treat generic 401 errors as expired token errors', async () => {
			// A generic 401 without lc_error_code should be rethrown as-is, not converted to ApplicationError
			const generic401Error = Object.assign(new Error('Unauthorized'), { status: 401 });

			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw generic401Error;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(generic401Error);
		});

		it('should handle invalid request errors', async () => {
			const invalidRequestError = Object.assign(new Error('Request failed'), {
				error: {
					error: {
						type: 'invalid_request_error',
						message: 'Invalid API request',
					},
				},
			});

			// Mock the stream processor to throw the invalid request error
			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw invalidRequestError;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ValidationError);
		});

		it('should rethrow unknown errors', async () => {
			const unknownError = new Error('Unknown error');

			// Mock createStreamProcessor to throw an unknown error (not GraphRecursionError or abort)
			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw unknownError;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(unknownError);
		});
	});
});
