import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';

function makeHandler(callback: {
	actionId: string;
	value: string;
	kind?: 'approval';
	label?: string;
}) {
	const settleActionMessage = vi.fn().mockResolvedValue(undefined);
	const deleteMessage = vi.fn().mockResolvedValue(undefined);
	const updateLatest = vi.fn().mockResolvedValue(undefined);
	const consume = vi.fn().mockResolvedValue(undefined);
	const resumeForChat = vi.fn((_config: { beforeResume?: () => Promise<void> }) =>
		(async function* () {})(),
	);
	const resolve = vi.fn().mockResolvedValue(callback);
	const handler = new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: { resumeForChat },
		logger: { warn: vi.fn() } as never,
		callbackStore: {
			peek: vi.fn().mockResolvedValue(callback),
			resolve,
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
		messageContextBridge: { updateLatest } as never,
		streamConsumer: { consume } as never,
		createResumeExecutionContext: async () => ({}),
	});
	const event = {
		actionId: 'callback-key',
		thread: { post: vi.fn() },
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		user: { userId: 'user-1', userName: 'alice', fullName: 'Alice' },
		adapter: { deleteMessage },
		raw: {},
	};
	return {
		handler,
		event,
		settleActionMessage,
		deleteMessage,
		updateLatest,
		resumeForChat,
		resolve,
	};
}

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
	'settles a $name card and writes message context only once the resume is admitted',
	async ({ callback, content }) => {
		const {
			handler,
			event,
			settleActionMessage,
			deleteMessage,
			updateLatest,
			resumeForChat,
			resolve,
		} = makeHandler(callback);

		await handler.handleAction(event as never);

		// Nothing happens while the resume is still waiting for the thread turn.
		expect(deleteMessage).not.toHaveBeenCalled();
		expect(settleActionMessage).not.toHaveBeenCalled();
		expect(updateLatest).not.toHaveBeenCalled();
		expect(resolve).not.toHaveBeenCalled();
		const { beforeResume } = resumeForChat.mock.calls[0][0];

		await beforeResume?.();

		expect(resolve).toHaveBeenCalledWith('callback-key');
		expect(updateLatest).toHaveBeenCalledWith(
			'agent-thread-1',
			'user-1',
			event.thread,
			expect.objectContaining({ messageId: 'message-1', interactingUserId: 'user-1' }),
		);
		expect(settleActionMessage).toHaveBeenCalledWith({
			agentId: 'agent-1',
			integration: { type: 'discord', credentialId: 'cred-1' },
			threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
			messageId: 'message-1',
			content,
		});
		expect(updateLatest.mock.invocationCallOrder[0]).toBeLessThan(
			settleActionMessage.mock.invocationCallOrder[0],
		);
	},
);
