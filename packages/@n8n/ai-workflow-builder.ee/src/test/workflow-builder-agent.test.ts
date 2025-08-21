import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ToolMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { MemorySaver } from '@langchain/langgraph';
import { GraphRecursionError } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { MAX_AI_BUILDER_PROMPT_LENGTH } from '@/constants';
import { ValidationError } from '@/errors';
import type { StreamOutput } from '@/types/streaming';
import { createStreamProcessor, formatMessages } from '@/utils/stream-processor';
import {
	WorkflowBuilderAgent,
	type WorkflowBuilderAgentConfig,
	type ChatPayload,
} from '@/workflow-builder-agent';

jest.mock('@/tools/add-node.tool', () => ({
	createAddNodeTool: jest.fn().mockReturnValue({ name: 'add_node' }),
}));
jest.mock('@/tools/connect-nodes.tool', () => ({
	createConnectNodesTool: jest.fn().mockReturnValue({ name: 'connect_nodes' }),
}));
jest.mock('@/tools/node-details.tool', () => ({
	createNodeDetailsTool: jest.fn().mockReturnValue({ name: 'node_details' }),
}));
jest.mock('@/tools/node-search.tool', () => ({
	createNodeSearchTool: jest.fn().mockReturnValue({ name: 'node_search' }),
}));
jest.mock('@/tools/remove-node.tool', () => ({
	createRemoveNodeTool: jest.fn().mockReturnValue({ name: 'remove_node' }),
}));
jest.mock('@/tools/update-node-parameters.tool', () => ({
	createUpdateNodeParametersTool: jest.fn().mockReturnValue({ name: 'update_node_parameters' }),
}));
jest.mock('@/tools/prompts/main-agent.prompt', () => ({
	mainAgentPrompt: {
		invoke: jest.fn().mockResolvedValue('mocked prompt'),
	},
}));
jest.mock('@/utils/operations-processor', () => ({
	processOperations: jest.fn(),
}));

jest.mock('@/utils/stream-processor', () => ({
	createStreamProcessor: jest.fn(),
	formatMessages: jest.fn(),
}));
jest.mock('@/utils/tool-executor', () => ({
	executeToolsInParallel: jest.fn(),
}));
jest.mock('@/chains/conversation-compact', () => ({
	conversationCompactChain: jest.fn(),
}));

const mockRandomUUID = jest.fn();
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: mockRandomUUID,
	},
	writable: true,
});

describe('WorkflowBuilderAgent', () => {
	let agent: WorkflowBuilderAgent;
	let mockLlmSimple: BaseChatModel;
	let mockLlmComplex: BaseChatModel;
	let mockLogger: Logger;
	let mockCheckpointer: MemorySaver;
	let parsedNodeTypes: INodeTypeDescription[];
	let config: WorkflowBuilderAgentConfig;

	const mockCreateStreamProcessor = createStreamProcessor as jest.MockedFunction<
		typeof createStreamProcessor
	>;
	const mockFormatMessages = formatMessages as jest.MockedFunction<typeof formatMessages>;

	beforeEach(() => {
		mockLlmSimple = mock<BaseChatModel>({
			_llmType: jest.fn().mockReturnValue('test-llm'),
			bindTools: jest.fn().mockReturnThis(),
			invoke: jest.fn(),
		});

		mockLlmComplex = mock<BaseChatModel>({
			_llmType: jest.fn().mockReturnValue('test-llm-complex'),
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
			llmSimpleTask: mockLlmSimple,
			llmComplexTask: mockLlmComplex,
			logger: mockLogger,
			checkpointer: mockCheckpointer,
		};

		agent = new WorkflowBuilderAgent(config);
	});

	describe('generateThreadId', () => {
		beforeEach(() => {
			mockRandomUUID.mockReset();
		});

		it('should generate thread ID with workflowId and userId', () => {
			const workflowId = 'workflow-123';
			const userId = 'user-456';
			const threadId = WorkflowBuilderAgent.generateThreadId(workflowId, userId);
			expect(threadId).toBe('workflow-workflow-123-user-user-456');
		});

		it('should generate thread ID with workflowId but without userId', () => {
			const workflowId = 'workflow-123';
			const threadId = WorkflowBuilderAgent.generateThreadId(workflowId);
			expect(threadId).toMatch(/^workflow-workflow-123-user-\d+$/);
		});

		it('should generate random UUID when no workflowId provided', () => {
			const mockUuid = 'test-uuid-1234-5678-9012';
			mockRandomUUID.mockReturnValue(mockUuid);

			const threadId = WorkflowBuilderAgent.generateThreadId();

			expect(mockRandomUUID).toHaveBeenCalled();
			expect(threadId).toBe(mockUuid);
		});
	});

	describe('chat method', () => {
		let mockPayload: ChatPayload;

		beforeEach(() => {
			mockPayload = {
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'workflow-123' },
				},
			};
		});

		it('should throw ValidationError when message exceeds maximum length', async () => {
			const longMessage = 'x'.repeat(MAX_AI_BUILDER_PROMPT_LENGTH + 1);
			const payload: ChatPayload = {
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
			(mockLlmSimple.invoke as jest.Mock).mockResolvedValue({
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

		it('should handle invalid request errors', async () => {
			const invalidRequestError = Object.assign(new Error('Request failed'), {
				error: {
					error: {
						type: 'invalid_request_error',
						message: 'Invalid API request',
					},
				},
			});

			(mockLlmSimple.invoke as jest.Mock).mockRejectedValue(invalidRequestError);

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ApplicationError);
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

	describe('getSessions', () => {
		beforeEach(() => {
			mockFormatMessages.mockImplementation(
				(messages: Array<AIMessage | HumanMessage | ToolMessage>) =>
					messages.map((m) => ({ type: m.constructor.name.toLowerCase(), content: m.content })),
			);
		});

		it('should return session for existing workflowId', async () => {
			const workflowId = 'workflow-123';
			const userId = 'user-456';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [new HumanMessage('Hello'), new AIMessage('Hi there!')],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockCheckpointer.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			const result = await agent.getSessions(workflowId, userId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0]).toMatchObject({
				sessionId: 'workflow-workflow-123-user-user-456',
				lastUpdated: '2023-12-01T12:00:00Z',
			});
			expect(result.sessions[0].messages).toHaveLength(2);
		});

		it('should return empty sessions when workflowId is undefined', async () => {
			const result = await agent.getSessions(undefined);

			expect(result.sessions).toHaveLength(0);
			expect(mockCheckpointer.getTuple).not.toHaveBeenCalled();
		});

		it('should return empty sessions when no checkpoint exists', async () => {
			const workflowId = 'workflow-123';
			(mockCheckpointer.getTuple as jest.Mock).mockRejectedValue(new Error('Thread not found'));

			const result = await agent.getSessions(workflowId);

			expect(result.sessions).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith('No session found for workflow:', {
				workflowId,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				error: expect.any(Error),
			});
		});

		it('should handle checkpoint without messages', async () => {
			const workflowId = 'workflow-123';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockCheckpointer.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			const result = await agent.getSessions(workflowId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toHaveLength(0);
		});

		it('should handle checkpoint with null messages', async () => {
			const workflowId = 'workflow-123';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: null,
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockCheckpointer.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			const result = await agent.getSessions(workflowId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toHaveLength(0);
		});
	});
});
