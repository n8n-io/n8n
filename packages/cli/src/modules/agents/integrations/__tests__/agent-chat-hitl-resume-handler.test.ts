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
	const resumeForChat = vi.fn(() => (async function* () {})());
	const handler = new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: { resumeForChat },
		logger: { warn: vi.fn() } as never,
		callbackStore: {
			resolve: vi.fn().mockResolvedValue(callback),
		} as never,
		deleteActionMessageBeforeResume: false,
		formatActionDecisionMessage: ({ approved, selectedLabel, user }) =>
			approved === true
				? `✅ Approved by ${user.fullName}`
				: `✅ ${selectedLabel} selected by ${user.fullName}`,
		settleActionMessage,
		resolveAgentThread: async () => ({
			threadId: { id: 'agent-thread-1' } as never,
			origin: null,
		}),
		getPlatformAgentContext: () => ({}),
		messageContextBridge: { updateLatest: vi.fn().mockResolvedValue(undefined) } as never,
		streamConsumer: { consume: vi.fn().mockResolvedValue(undefined) } as never,
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
		resumeForChat.mock.invocationCallOrder[0],
	);
});

it('writes message context to the bound originating session', async () => {
	const updateLatest = vi.fn().mockResolvedValue(undefined);
	const thread = { post: vi.fn() };
	const handler = new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: { resumeForChat: vi.fn(() => (async function* () {})()) },
		logger: { warn: vi.fn() } as never,
		callbackStore: {
			resolve: vi.fn().mockResolvedValue({
				actionId: 'resume:run-1:tool-1:0',
				value: JSON.stringify({ approved: true }),
				kind: 'approval',
			}),
		} as never,
		deleteActionMessageBeforeResume: false,
		settleActionMessage: vi.fn().mockResolvedValue(undefined),
		resolveAgentThread: async () => ({
			threadId: { id: 'task-task-1-uuid' } as never,
			origin: { threadId: 'task-task-1-uuid', resourceId: 'task:task-1' },
		}),
		getPlatformAgentContext: () => ({}),
		messageContextBridge: { updateLatest } as never,
		streamConsumer: { consume: vi.fn().mockResolvedValue(undefined) } as never,
		createResumeExecutionContext: async () => ({}),
	});

	await handler.handleAction({
		actionId: 'callback-key',
		thread,
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		user: { userId: 'user-1', userName: 'alice', fullName: 'Alice' },
		adapter: { deleteMessage: vi.fn() },
		raw: {},
	} as never);

	expect(updateLatest).toHaveBeenCalledWith(
		'task-task-1-uuid',
		'task:task-1',
		thread,
		expect.objectContaining({
			messageId: 'message-1',
			interactingUserId: 'user-1',
		}),
	);
});
