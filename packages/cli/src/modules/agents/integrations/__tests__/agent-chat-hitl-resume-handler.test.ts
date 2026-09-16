import type { ActionEvent, Thread } from 'chat';
import { type Logger, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { AgentMessageQueueService } from '../../agent-message-queue.service';
import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';
import type { CallbackStore } from '../callback-store';

it('rejects an invalid action before the callback key is consumed', async () => {
	const callbackStore = mock<CallbackStore>();
	const messageQueue = mock<AgentMessageQueueService>();
	callbackStore.resolve.mockImplementation(async (_id, persist) => {
		const callback = { actionId: 'resume:incomplete', value: '{}' };
		await persist(callback);
		return callback;
	});
	const handler = new AgentChatHitlResumeHandler(
		mock<ConstructorParameters<typeof AgentChatHitlResumeHandler>[0]>({
			callbackStore,
			messageQueue,
			logger: mock<Logger>(),
		}),
	);
	await expect(
		handler.handleAction(mock<ActionEvent>({ actionId: 'callback-key', thread: mock<Thread>() })),
	).rejects.toThrow(UserError);
	expect(messageQueue.enqueue).not.toHaveBeenCalled();
});

it.each([
	{
		name: 'approval',
		callback: {
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			kind: 'approval' as const,
		},
		content: '✅ Approved by Alice',
	},
	{
		name: 'non-approval selection',
		callback: {
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ type: 'button', value: 'continue' }),
			label: 'Continue',
		},
		content: '✅ Continue selected by Alice',
	},
])('settles a $name card in place before resuming the agent', async ({ callback, content }) => {
	const settleActionMessage = vi.fn().mockResolvedValue(undefined);
	const deleteMessage = vi.fn().mockResolvedValue(undefined);
	const resumeForChat = vi.fn(() => (async function* () {})());
	const messageQueue = mock<AgentMessageQueueService>();
	messageQueue.getResumeScope.mockResolvedValue({
		threadId: 'agent-thread-1',
		resourceId: 'user-1',
	});
	const callbackStore = mock<CallbackStore>();
	callbackStore.resolve.mockImplementation(async (_id, persist) => {
		await persist(callback);
		return callback;
	});
	const handler = new AgentChatHitlResumeHandler({
		messageQueue,
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: { resumeForChat },
		logger: { warn: vi.fn() } as never,
		callbackStore,
		deleteActionMessageBeforeResume: false,
		formatActionDecisionMessage: ({ approved, selectedLabel, user }) =>
			approved === true
				? `✅ Approved by ${user.fullName}`
				: `✅ ${selectedLabel} selected by ${user.fullName}`,
		settleActionMessage,
		getPlatformAgentContext: () => ({}),
		messageContextBridge: { updateLatest: vi.fn().mockResolvedValue(undefined) } as never,
		streamConsumer: { consume: vi.fn().mockResolvedValue(undefined) } as never,
		createResumeExecutionContext: async () => ({}),
	});

	const thread = {
		id: 'discord:800000000000000001:700000000000000001:600000000000000001',
		post: vi.fn(),
		adapter: { deleteMessage },
		toJSON: vi.fn().mockReturnValue({ _type: 'chat:Thread' }),
	};
	await handler.handleAction({
		actionId: 'callback-key',
		thread,
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		user: { userId: 'user-1', userName: 'alice', fullName: 'Alice' },
		adapter: { deleteMessage },
		raw: {},
	} as never);

	expect(settleActionMessage).not.toHaveBeenCalled();
	expect(resumeForChat).not.toHaveBeenCalled();
	const { payload } = messageQueue.enqueue.mock.calls[0][0];
	if (payload.source !== 'integration' || payload.kind !== 'hitl') throw new Error('Expected HITL');
	await handler.processQueuedResponse(payload, thread as never, 'agent-thread-1', {
		abortSignal: new AbortController().signal,
		onExecutionStarted: async () => {},
	});

	expect(deleteMessage).not.toHaveBeenCalled();
	expect(settleActionMessage).toHaveBeenCalledWith({
		agentId: 'agent-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		content,
	});
	expect(settleActionMessage.mock.invocationCallOrder[0]).toBeLessThan(
		resumeForChat.mock.invocationCallOrder[0],
	);

	messageQueue.getResumeScope.mockRejectedValueOnce(new Error('This action has expired'));
	await expect(
		handler.processQueuedResponse(payload, thread as never, 'agent-thread-1', {
			abortSignal: new AbortController().signal,
			onExecutionStarted: async () => {},
		}),
	).rejects.toThrow('expired');
	expect(resumeForChat).toHaveBeenCalledTimes(1);
	expect(settleActionMessage).toHaveBeenCalledTimes(1);
});
