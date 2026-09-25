import type { ResultCard } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { IExecutionResponse } from '@n8n/db';
import type { WorkflowExecuteAfterContext, WorkflowExecuteResumeContext } from '@n8n/decorators';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ChatExecutionManager } from '@/chat/chat-execution-manager';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type {
	ChatHubExecutionStore,
	ChatHubExecutionContext,
} from '@/modules/chat-hub/chat-hub-execution-store.service';
import { ChatHubExecutionWatcherService } from '@/modules/chat-hub/chat-hub-execution-watcher.service';
import type { ChatHubExecutionService } from '@/modules/chat-hub/chat-hub-execution.service';
import type { ChatHubMessageRepository } from '@/modules/chat-hub/chat-message.repository';
import type { ChatStreamService } from '@/modules/chat-hub/chat-stream.service';
import type { ResultCardsService } from '@/modules/chat-hub/result-cards/result-cards.service';

const EXECUTION_ID = '12345678';
const SESSION_ID = 'bbbbbbbb-2222-4000-8000-000000000002';
const USER_ID = 'cccccccc-3333-4000-8000-000000000003';
const MESSAGE_ID = 'dddddddd-4444-4000-8000-000000000004';
const PREV_MESSAGE_ID = 'eeeeeeee-5555-4000-8000-000000000005';
const WORKFLOW_ID = '3qXqnkHzVukVR9Jq';
const WAITING_MESSAGE_ID = '11111111-1111-4000-8000-000000000007';
const MOCK_NEW_MESSAGE_ID = 'aaaaaaaa-1111-4000-8000-000000000001';

vi.mock('uuid', () => ({
	v4: vi.fn(() => MOCK_NEW_MESSAGE_ID),
}));

describe('ChatHubExecutionWatcherService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const executionStore = mock<ChatHubExecutionStore>();
	const messageRepository = mock<ChatHubMessageRepository>();
	const chatHubExecutionService = mock<ChatHubExecutionService>();
	const executionPersistence = mock<ExecutionPersistence>();
	const chatStreamService = mock<ChatStreamService>();
	const executionManager = mock<ChatExecutionManager>();
	const resultCardsService = mock<ResultCardsService>();

	let service: ChatHubExecutionWatcherService;

	const createContext = (overrides?: Partial<ChatHubExecutionContext>): ChatHubExecutionContext =>
		({
			executionId: EXECUTION_ID,
			sessionId: SESSION_ID,
			userId: USER_ID,
			messageId: MESSAGE_ID,
			previousMessageId: PREV_MESSAGE_ID,
			model: { provider: 'n8n', workflowId: WORKFLOW_ID },
			responseMode: 'lastNode',
			awaitingResume: false,
			createMessageOnResume: false,
			...overrides,
		}) as ChatHubExecutionContext;

	beforeEach(() => {
		vi.clearAllMocks();
		resultCardsService.buildForRun.mockResolvedValue({ cards: [], cardedNodeRuns: [] });

		service = new ChatHubExecutionWatcherService(
			logger,
			executionStore,
			messageRepository,
			chatHubExecutionService,
			executionPersistence,
			chatStreamService,
			executionManager,
			resultCardsService,
		);
	});

	describe('handleExecutionResumed', () => {
		const createResumeContext = (executionId: string): WorkflowExecuteResumeContext =>
			({ executionId }) as WorkflowExecuteResumeContext;

		it('should skip if context not found', async () => {
			executionStore.get.mockResolvedValue(null);

			await service.handleExecutionResumed(createResumeContext(EXECUTION_ID));

			expect(executionStore.update).not.toHaveBeenCalled();
		});

		it('should skip if not resuming', async () => {
			executionStore.get.mockResolvedValue(createContext({ awaitingResume: false }));

			await service.handleExecutionResumed(createResumeContext(EXECUTION_ID));

			expect(executionStore.update).not.toHaveBeenCalled();
		});

		it('should notify frontend when execution resumes', async () => {
			const context = createContext({ awaitingResume: true });
			executionStore.get.mockResolvedValue(context);

			await service.handleExecutionResumed(createResumeContext(EXECUTION_ID));

			expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, { awaitingResume: false });
			expect(chatStreamService.startExecution).toHaveBeenCalledWith(USER_ID, SESSION_ID);
			expect(chatStreamService.startStream).toHaveBeenCalledWith({
				userId: USER_ID,
				sessionId: SESSION_ID,
				messageId: MESSAGE_ID,
				previousMessageId: PREV_MESSAGE_ID,
				retryOfMessageId: null,
				executionId: parseInt(EXECUTION_ID, 10),
			});
		});

		it('should create new message on resume when createMessageOnResume is true', async () => {
			const context = createContext({
				awaitingResume: true,
				createMessageOnResume: true,
				messageId: WAITING_MESSAGE_ID,
			});
			executionStore.get.mockResolvedValue(context);

			await service.handleExecutionResumed(createResumeContext(EXECUTION_ID));

			// Should mark waiting message as success
			expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(WAITING_MESSAGE_ID, {
				status: 'success',
			});

			// Should create new message
			expect(messageRepository.createChatMessage).toHaveBeenCalledWith({
				id: MOCK_NEW_MESSAGE_ID,
				sessionId: SESSION_ID,
				previousMessageId: WAITING_MESSAGE_ID,
				executionId: parseInt(EXECUTION_ID, 10),
				type: 'ai',
				name: 'AI',
				status: 'running',
				content: '',
				retryOfMessageId: null,
				provider: 'n8n',
				workflowId: WORKFLOW_ID,
			});

			// Should update context with new message ID
			expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, {
				previousMessageId: WAITING_MESSAGE_ID,
				messageId: MOCK_NEW_MESSAGE_ID,
				createMessageOnResume: false,
				awaitingResume: false,
			});

			// Should notify with new message ID
			expect(chatStreamService.startStream).toHaveBeenCalledWith(
				expect.objectContaining({
					messageId: MOCK_NEW_MESSAGE_ID,
					previousMessageId: WAITING_MESSAGE_ID,
				}),
			);
		});
	});

	describe('handleWorkflowExecuteAfter', () => {
		const createRunData = (overrides?: Partial<IRun>): IRun =>
			({
				status: 'success',
				finished: true,
				data: {
					resultData: {
						lastNodeExecuted: 'TestNode',
						runData: {
							TestNode: [{ data: { main: [[{ json: { output: 'Hello' } }]] } }],
						},
					},
				},
				...overrides,
			}) as IRun;

		const workflow = {
			id: WORKFLOW_ID,
			name: 'Test workflow',
			nodes: [],
		} as unknown as IWorkflowBase;

		const createAfterContext = (executionId: string, runData: IRun): WorkflowExecuteAfterContext =>
			({ executionId, runData, workflow }) as WorkflowExecuteAfterContext;

		it('should skip if context not found', async () => {
			executionStore.get.mockResolvedValue(null);

			await service.handleWorkflowExecuteAfter(createAfterContext(EXECUTION_ID, createRunData()));

			expect(chatStreamService.endExecution).not.toHaveBeenCalled();
		});

		describe('error handling', () => {
			it('should push error results on error status', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractErrorMessage.mockReturnValue('Something went wrong');

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'error' })),
				);

				expect(chatStreamService.sendChunk).toHaveBeenCalledWith(
					SESSION_ID,
					MESSAGE_ID,
					'Something went wrong',
				);
				expect(chatStreamService.endStream).toHaveBeenCalledWith(SESSION_ID, MESSAGE_ID, 'error');
				expect(chatStreamService.endExecution).toHaveBeenCalledWith(USER_ID, SESSION_ID, 'error');
				expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
					content: 'Something went wrong',
					status: 'error',
				});
				expect(executionStore.remove).toHaveBeenCalledWith(EXECUTION_ID);
			});

			it('should use default error message when none extracted', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractErrorMessage.mockReturnValue(undefined);

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'error' })),
				);

				expect(chatStreamService.sendChunk).toHaveBeenCalledWith(
					SESSION_ID,
					MESSAGE_ID,
					'Failed to generate a response',
				);
			});

			it('should handle crashed status as error', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractErrorMessage.mockReturnValue('Crash!');

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'crashed' })),
				);

				expect(chatStreamService.endStream).toHaveBeenCalledWith(SESSION_ID, MESSAGE_ID, 'error');
			});
		});

		describe('canceled handling', () => {
			it('should end execution with cancelled status', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'canceled' })),
				);

				expect(chatStreamService.endExecution).toHaveBeenCalledWith(
					USER_ID,
					SESSION_ID,
					'cancelled',
				);
				expect(executionStore.remove).toHaveBeenCalledWith(EXECUTION_ID);
			});
		});

		describe('success handling', () => {
			it('should push final results on successful completion', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue('Hello world');

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'success', finished: true })),
				);

				expect(chatStreamService.sendChunk).toHaveBeenCalledWith(
					SESSION_ID,
					MESSAGE_ID,
					'Hello world',
				);
				expect(chatStreamService.endStream).toHaveBeenCalledWith(SESSION_ID, MESSAGE_ID, 'success');
				expect(chatStreamService.endExecution).toHaveBeenCalledWith(USER_ID, SESSION_ID, 'success');
				expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
					content: 'Hello world',
					status: 'success',
				});
				expect(executionStore.remove).toHaveBeenCalledWith(EXECUTION_ID);
			});

			it('should handle empty message on success', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue(undefined);

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'success', finished: true })),
				);

				expect(chatStreamService.sendChunk).not.toHaveBeenCalled();
				expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
					content: '',
					status: 'success',
				});
			});
		});

		describe('waiting handling', () => {
			it('should update message with waiting status and message', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue('Please wait...');

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
				);

				expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
					content: 'Please wait...',
					status: 'waiting',
				});
				expect(chatStreamService.sendChunk).toHaveBeenCalledWith(
					SESSION_ID,
					MESSAGE_ID,
					'Please wait...',
				);
				expect(chatStreamService.endStream).toHaveBeenCalledWith(SESSION_ID, MESSAGE_ID, 'waiting');
				expect(chatStreamService.endExecution).toHaveBeenCalledWith(USER_ID, SESSION_ID, 'success');
			});

			it('should handle waiting without message', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue(undefined);

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
				);

				expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
					content: '',
					status: 'waiting',
				});
				expect(chatStreamService.sendChunk).not.toHaveBeenCalled();
			});

			it('should mark as resuming for external trigger in lastNode mode', async () => {
				const context = createContext({ responseMode: 'lastNode' });
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue(undefined);

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
				);

				expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, {
					awaitingResume: true,
					createMessageOnResume: true,
				});
			});

			describe('auto-resume in responseNodes mode', () => {
				const createExecution = (lastNodeType: string, params?: Record<string, unknown>) =>
					({
						id: EXECUTION_ID,
						workflowData: {
							nodes: [{ name: 'TestNode', type: lastNodeType, parameters: params ?? {} }],
						},
						data: {
							resultData: {
								lastNodeExecuted: 'TestNode',
							},
						},
					}) as unknown as IExecutionResponse;

				it('should trigger auto-resume for Respond to Webhook node', async () => {
					const context = createContext({ responseMode: 'responseNodes' });
					executionStore.get.mockResolvedValue(context);
					chatHubExecutionService.extractMessage.mockReturnValue('Webhook response');

					const execution = createExecution('n8n-nodes-base.respondToWebhook');
					executionPersistence.findSingleExecution.mockResolvedValue(execution);

					await service.handleWorkflowExecuteAfter(
						createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
					);

					// Should mark current message as success
					expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
						status: 'success',
					});

					// Should create new message
					expect(messageRepository.createChatMessage).toHaveBeenCalledWith(
						expect.objectContaining({
							id: MOCK_NEW_MESSAGE_ID,
							previousMessageId: MESSAGE_ID,
							status: 'running',
						}),
					);

					// Should update context
					expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, {
						previousMessageId: MESSAGE_ID,
						messageId: MOCK_NEW_MESSAGE_ID,
						awaitingResume: true,
						createMessageOnResume: false,
					});

					// Should trigger execution resume
					expect(executionManager.runWorkflow).toHaveBeenCalledWith(execution, {
						action: 'sendMessage',
						chatInput: '',
						sessionId: SESSION_ID,
					});
				});

				it('should trigger auto-resume when waitUserReply is false', async () => {
					const context = createContext({ responseMode: 'responseNodes' });
					executionStore.get.mockResolvedValue(context);
					chatHubExecutionService.extractMessage.mockReturnValue(undefined);

					const execution = createExecution('@n8n/n8n-nodes-langchain.chat', {
						waitUserReply: false,
					});
					executionPersistence.findSingleExecution.mockResolvedValue(execution);

					await service.handleWorkflowExecuteAfter(
						createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
					);

					expect(executionManager.runWorkflow).toHaveBeenCalled();
				});

				it('should not auto-resume when chat node is in sendAndWait mode', async () => {
					const context = createContext({ responseMode: 'responseNodes' });
					executionStore.get.mockResolvedValue(context);
					chatHubExecutionService.extractMessage.mockReturnValue(undefined);

					const execution = createExecution('@n8n/n8n-nodes-langchain.chat', {
						operation: 'sendAndWait',
					});
					executionPersistence.findSingleExecution.mockResolvedValue(execution);

					await service.handleWorkflowExecuteAfter(
						createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
					);

					expect(executionManager.runWorkflow).not.toHaveBeenCalled();
					expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, {
						awaitingResume: true,
						createMessageOnResume: true,
					});
				});

				it('should mark as resuming when execution not found', async () => {
					const context = createContext({ responseMode: 'responseNodes' });
					executionStore.get.mockResolvedValue(context);
					chatHubExecutionService.extractMessage.mockReturnValue(undefined);
					executionPersistence.findSingleExecution.mockResolvedValue(undefined);

					await service.handleWorkflowExecuteAfter(
						createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
					);

					expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, {
						awaitingResume: true,
						createMessageOnResume: true,
					});
				});
			});
		});

		it('should not remove context when finished is false', async () => {
			const context = createContext();
			executionStore.get.mockResolvedValue(context);
			chatHubExecutionService.extractMessage.mockReturnValue('Hello');

			await service.handleWorkflowExecuteAfter(
				createAfterContext(EXECUTION_ID, createRunData({ status: 'success', finished: false })),
			);

			expect(executionStore.remove).not.toHaveBeenCalled();
		});

		describe('result cards', () => {
			const card: ResultCard = {
				type: 'keyValue',
				title: 'Weekly summary',
				pairs: [{ key: 'Total', value: '12' }],
			};

			it('appends result cards to the final message and remembers the carded node runs', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue('Sent.');
				resultCardsService.buildForRun.mockResolvedValue({
					cards: [card],
					cardedNodeRuns: ['Weekly summary#0'],
				});

				const runData = createRunData();
				await service.handleWorkflowExecuteAfter(createAfterContext(EXECUTION_ID, runData));

				expect(resultCardsService.buildForRun).toHaveBeenCalledWith(workflow, runData, []);
				const sent = chatStreamService.sendChunk.mock.calls[0][2];
				expect(sent.startsWith('Sent.\n\n<command:card>')).toBe(true);
				expect(sent).toContain('"title":"Weekly summary"');
				expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, {
					cardedNodeRuns: ['Weekly summary#0'],
				});
				expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
					content: sent,
					status: 'success',
				});
			});

			it('sends cards alone when there is no text and skips already carded node runs', async () => {
				const context = createContext({ cardedNodeRuns: ['Gmail#0'] });
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue(undefined);
				resultCardsService.buildForRun.mockResolvedValue({
					cards: [card],
					cardedNodeRuns: ['Gmail#1'],
				});

				const runData = createRunData();
				await service.handleWorkflowExecuteAfter(createAfterContext(EXECUTION_ID, runData));

				expect(resultCardsService.buildForRun).toHaveBeenCalledWith(workflow, runData, ['Gmail#0']);
				const sent = chatStreamService.sendChunk.mock.calls[0][2];
				expect(sent.startsWith('<command:card>')).toBe(true);
				expect(executionStore.update).toHaveBeenCalledWith(EXECUTION_ID, {
					cardedNodeRuns: ['Gmail#0', 'Gmail#1'],
				});
			});

			it('carries cards into the waiting message as well', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue('Please wait...');
				resultCardsService.buildForRun.mockResolvedValue({
					cards: [card],
					cardedNodeRuns: ['Weekly summary#0'],
				});

				await service.handleWorkflowExecuteAfter(
					createAfterContext(EXECUTION_ID, createRunData({ status: 'waiting' })),
				);

				const sent = chatStreamService.sendChunk.mock.calls[0][2];
				expect(sent.startsWith('Please wait...\n\n<command:card>')).toBe(true);
				expect(messageRepository.updateChatMessage).toHaveBeenCalledWith(MESSAGE_ID, {
					content: sent,
					status: 'waiting',
				});
			});

			it('leaves the message and store untouched when no cards are built', async () => {
				const context = createContext();
				executionStore.get.mockResolvedValue(context);
				chatHubExecutionService.extractMessage.mockReturnValue('Hello world');

				await service.handleWorkflowExecuteAfter(createAfterContext(EXECUTION_ID, createRunData()));

				expect(chatStreamService.sendChunk).toHaveBeenCalledWith(
					SESSION_ID,
					MESSAGE_ID,
					'Hello world',
				);
				expect(executionStore.update).not.toHaveBeenCalled();
			});
		});
	});
});
