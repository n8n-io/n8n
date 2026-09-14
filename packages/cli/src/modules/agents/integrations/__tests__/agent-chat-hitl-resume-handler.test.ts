import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';

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
	const resumeRuntime = vi.fn();
	const resumeForChat = vi.fn((config: { beforeResume?: () => Promise<void> }) =>
		(async function* () {
			await config.beforeResume?.();
			resumeRuntime();
			yield { type: 'finish' as const, finishReason: 'stop' as const };
		})(),
	);
	const claim = {
		executionId: 'execution-1',
		threadId: 'agent-thread-1',
		abortSignal: new AbortController().signal,
		release: vi.fn(async () => {}),
		fail: vi.fn(async () => {}),
	};
	const handler = new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: {
			resumeForChat,
			resolveResumeThread: vi.fn().mockResolvedValue('agent-thread-1'),
		},
		turnQueueService: { tryRunNow: vi.fn().mockResolvedValue(claim) },
		logger: { warn: vi.fn() } as never,
		callbackStore: {
			peek: vi.fn().mockResolvedValue(callback),
			resolve: vi.fn().mockResolvedValue(callback),
		} as never,
		deleteActionMessageBeforeResume: false,
		formatActionDecisionMessage: ({ approved, selectedLabel, user }) =>
			approved === true
				? `✅ Approved by ${user.fullName}`
				: `✅ ${selectedLabel} selected by ${user.fullName}`,
		settleActionMessage,
		resolvePlatformThreadId: () =>
			'discord:800000000000000001:700000000000000001:600000000000000001',
		toAgentThreadId: () => ({ id: 'agent-thread-1' }) as never,
		getPlatformAgentContext: () => ({}),
		messageContextBridge: { updateLatest: vi.fn().mockResolvedValue(undefined) } as never,
		streamConsumer: {
			consume: vi.fn(async (stream: AsyncIterable<unknown>) => {
				for await (const _chunk of stream) {
					// Consume the resume through its lifecycle.
				}
			}),
		} as never,
		createResumeExecutionContext: async () => ({}),
	});

	await handler.handleAction({
		actionId: 'callback-key',
		thread: { post: vi.fn() },
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		user: { userId: 'user-1', userName: 'alice', fullName: 'Alice' },
		adapter: { deleteMessage },
		raw: {},
	} as never);

	expect(deleteMessage).not.toHaveBeenCalled();
	expect(settleActionMessage).toHaveBeenCalledWith({
		agentId: 'agent-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		content,
	});
	expect(settleActionMessage.mock.invocationCallOrder[0]).toBeLessThan(
		resumeRuntime.mock.invocationCallOrder[0],
	);
});
