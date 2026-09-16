import type { StreamChunk } from '@n8n/agents';
import type { ActionEvent, Thread } from 'chat';
import { type Logger, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ResumeForChatConfig } from '../../agent-execution-orchestrator.service';
import type { AgentMessageQueueService } from '../../agent-message-queue.service';
import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';
import type { AgentChatStreamConsumer } from '../agent-chat-stream-consumer';
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
])(
	'settles a $name card after a successful claim and preserves it after a failed claim',
	async ({ callback, content }) => {
		const settleActionMessage = vi.fn().mockResolvedValue(undefined);
		const deleteMessage = vi.fn().mockResolvedValue(undefined);
		let claimSucceeds = true;
		const claimCheckpoint = vi.fn();
		const resumeForChat = vi.fn((config: ResumeForChatConfig) =>
			(async function* (): AsyncGenerator<StreamChunk> {
				claimCheckpoint();
				if (!claimSucceeds) throw new Error('Checkpoint claim failed');
				await config.onResumeClaimed?.();
				yield { type: 'finish', finishReason: 'stop' };
			})(),
		);
		const streamConsumer = mock<AgentChatStreamConsumer>();
		streamConsumer.consume.mockImplementation(async (stream) => {
			for await (const _chunk of stream) {
				// Consume the stream.
			}
		});
		const updateLatest = vi.fn().mockResolvedValue(undefined);
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
			messageContextBridge: { updateLatest } as never,
			streamConsumer,
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
		expect(messageQueue.enqueue).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'agent-thread-1',
			}),
		);
		const { payload } = messageQueue.enqueue.mock.calls[0][0];
		if (payload.source !== 'integration' || payload.kind !== 'hitl')
			throw new Error('Expected HITL');
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
		expect(claimCheckpoint.mock.invocationCallOrder[0]).toBeLessThan(
			updateLatest.mock.invocationCallOrder[0],
		);
		expect(claimCheckpoint.mock.invocationCallOrder[0]).toBeLessThan(
			settleActionMessage.mock.invocationCallOrder[0],
		);

		claimSucceeds = false;
		await expect(
			handler.processQueuedResponse(payload, thread as never, 'agent-thread-1', {
				abortSignal: new AbortController().signal,
				onExecutionStarted: async () => {},
			}),
		).rejects.toThrow('Checkpoint claim failed');
		expect(updateLatest).toHaveBeenCalledTimes(1);
		expect(settleActionMessage).toHaveBeenCalledTimes(1);
	},
);
