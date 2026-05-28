import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';

import type { StreamOutput } from '../../../types/streaming';
import type { ChatPayload } from '../../../workflow-builder-agent';
import { SessionChatHandler } from '../session-chat-handler';

// Mock the session utilities
jest.mock('../../utils/code-builder-session', () => ({
	loadCodeBuilderSession: jest.fn().mockResolvedValue({
		conversationEntries: [],
		previousSummary: undefined,
	}),
	saveCodeBuilderSession: jest.fn().mockResolvedValue(undefined),
	compactSessionIfNeeded: jest.fn().mockImplementation((session: unknown) => session),
	generateCodeBuilderThreadId: jest.fn().mockReturnValue('test-thread-id'),
	saveSessionMessages: jest.fn().mockResolvedValue(undefined),
}));

describe('SessionChatHandler', () => {
	let mockCheckpointer: jest.Mocked<MemorySaver>;
	let mockLlm: jest.Mocked<BaseChatModel>;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockCheckpointer = {
			get: jest.fn(),
			put: jest.fn(),
			list: jest.fn(),
			getTuple: jest.fn(),
		} as unknown as jest.Mocked<MemorySaver>;

		mockLlm = {
			invoke: jest.fn(),
			bindTools: jest.fn(),
		} as unknown as jest.Mocked<BaseChatModel>;

		mockLogger = {
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		} as unknown as jest.Mocked<Logger>;
	});

	describe('onGenerationSuccess callback', () => {
		it('should call onGenerationSuccess when workflow-updated chunk is received', async () => {
			const onGenerationSuccess = jest.fn().mockResolvedValue(undefined);

			const handler = new SessionChatHandler({
				checkpointer: mockCheckpointer,
				llm: mockLlm,
				logger: mockLogger,
				onGenerationSuccess,
			});

			const mockAgentChat = async function* (): AsyncGenerator<StreamOutput, void, unknown> {
				yield { messages: [{ role: 'assistant', type: 'message', text: 'Planning...' }] };
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'workflow-updated',
							codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
						},
					],
				};
				yield { messages: [{ type: 'session-messages', messages: [] }] };
			};

			const payload: ChatPayload = {
				id: 'test-1',
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'wf-1', name: 'Test' },
				},
			};

			const generator = handler.execute({
				payload,
				userId: 'user-1',
				agentChat: mockAgentChat,
			});

			// Consume all chunks
			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(onGenerationSuccess).toHaveBeenCalledTimes(1);
		});

		it('should NOT call onGenerationSuccess when no workflow-updated chunk is received', async () => {
			const onGenerationSuccess = jest.fn().mockResolvedValue(undefined);

			const handler = new SessionChatHandler({
				checkpointer: mockCheckpointer,
				llm: mockLlm,
				logger: mockLogger,
				onGenerationSuccess,
			});

			const mockAgentChat = async function* (): AsyncGenerator<StreamOutput, void, unknown> {
				yield { messages: [{ role: 'assistant', type: 'message', text: 'Planning...' }] };
				yield { messages: [{ role: 'assistant', type: 'message', text: 'Failed to generate.' }] };
			};

			const payload: ChatPayload = {
				id: 'test-2',
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'wf-2', name: 'Test' },
				},
			};

			const generator = handler.execute({
				payload,
				userId: 'user-2',
				agentChat: mockAgentChat,
			});

			// Consume all chunks
			for await (const _ of generator) {
				// consume
			}

			expect(onGenerationSuccess).not.toHaveBeenCalled();
		});

		it('should log warning if onGenerationSuccess callback throws', async () => {
			const callbackError = new Error('Callback failed');
			const onGenerationSuccess = jest.fn().mockRejectedValue(callbackError);

			const handler = new SessionChatHandler({
				checkpointer: mockCheckpointer,
				llm: mockLlm,
				logger: mockLogger,
				onGenerationSuccess,
			});

			const mockAgentChat = async function* (): AsyncGenerator<StreamOutput, void, unknown> {
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'workflow-updated',
							codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
						},
					],
				};
			};

			const payload: ChatPayload = {
				id: 'test-3',
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'wf-3', name: 'Test' },
				},
			};

			const generator = handler.execute({
				payload,
				userId: 'user-3',
				agentChat: mockAgentChat,
			});

			// Consume all chunks
			for await (const _ of generator) {
				// consume
			}

			expect(onGenerationSuccess).toHaveBeenCalledTimes(1);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Failed to execute onGenerationSuccess callback',
				{ error: callbackError },
			);
		});

		it('should work without onGenerationSuccess callback', async () => {
			const handler = new SessionChatHandler({
				checkpointer: mockCheckpointer,
				llm: mockLlm,
				logger: mockLogger,
				// No onGenerationSuccess callback
			});

			const mockAgentChat = async function* (): AsyncGenerator<StreamOutput, void, unknown> {
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'workflow-updated',
							codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
						},
					],
				};
			};

			const payload: ChatPayload = {
				id: 'test-4',
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'wf-4', name: 'Test' },
				},
			};

			const generator = handler.execute({
				payload,
				userId: 'user-4',
				agentChat: mockAgentChat,
			});

			// Should not throw
			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);
		});
	});

	describe('session management without workflow ID', () => {
		it('should skip session management when no workflow ID is provided', async () => {
			const onGenerationSuccess = jest.fn().mockResolvedValue(undefined);

			const handler = new SessionChatHandler({
				checkpointer: mockCheckpointer,
				llm: mockLlm,
				logger: mockLogger,
				onGenerationSuccess,
			});

			const mockAgentChat = async function* (): AsyncGenerator<StreamOutput, void, unknown> {
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'workflow-updated',
							codeSnippet: JSON.stringify({ nodes: [], connections: {} }),
						},
					],
				};
			};

			const payload: ChatPayload = {
				id: 'test-5',
				message: 'Create a workflow',
				// No workflowContext with id
			};

			const generator = handler.execute({
				payload,
				userId: 'user-5',
				agentChat: mockAgentChat,
			});

			// Consume all chunks
			for await (const _ of generator) {
				// consume
			}

			// When no workflow ID, session management is skipped,
			// which means onGenerationSuccess is NOT called (since that's session-managed)
			expect(onGenerationSuccess).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('No workflow ID, skipping session management');
		});
	});
});
