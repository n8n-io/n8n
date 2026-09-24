import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';

it.each([
	{
		name: 'approval',
		background: false,
		callback: {
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			kind: 'approval' as const,
		},
		content: '✅ Approved by Alice',
		resumeData: { approved: true },
	},
	{
		name: 'session approval',
		background: false,
		callback: {
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true, scope: 'session' }),
			kind: 'approval' as const,
		},
		content: '✅ Approved by Alice',
		resumeData: { approved: true, scope: 'session' },
	},
	{
		name: 'non-approval selection',
		background: false,
		callback: {
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ type: 'button', value: 'continue' }),
			label: 'Continue',
		},
		content: '✅ Continue selected by Alice',
		resumeData: { type: 'button', value: 'continue' },
	},
	{
		name: 'background approval after a restart',
		background: true,
		callback: {
			actionId: 'bg:96fa13fa-75db-4439-b7c8-cd04a2c2f9b7:abcdefghijklmnopqrstuv:1',
			value: '',
			kind: 'approval' as const,
		},
		content: '✅ Approved by Alice',
		resumeData: { approved: true },
	},
	{
		name: 'background session approval after a restart',
		background: true,
		callback: {
			actionId: 'bg:96fa13fa-75db-4439-b7c8-cd04a2c2f9b7:abcdefghijklmnopqrstuv:s',
			value: '',
			kind: 'approval' as const,
		},
		content: '✅ Approved by Alice',
		resumeData: { approved: true, scope: 'session' },
	},
])('settles a $name card in place', async ({ callback, content, background, resumeData }) => {
	const settleActionMessage = vi.fn().mockResolvedValue(undefined);
	const deleteMessage = vi.fn().mockResolvedValue(undefined);
	const resumeForChat = vi.fn(() => (async function* () {})());
	const resolve = vi.fn().mockResolvedValue(background ? undefined : callback);
	const handler = new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: { resumeForChat },
		logger: { warn: vi.fn() } as never,
		callbackStore: {
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
		messageContextBridge: { capture: vi.fn().mockReturnValue(undefined) } as never,
		streamConsumer: { consume: vi.fn().mockResolvedValue(undefined) } as never,
		createResumeExecutionContext: async () => ({}),
	});

	await handler.handleAction({
		actionId: background ? callback.actionId : 'callback-key',
		thread: { post: vi.fn() },
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		user: { userId: 'user-1', userName: 'alice', fullName: 'Alice' },
		adapter: { deleteMessage },
		raw: {},
	} as never);

	expect(deleteMessage).not.toHaveBeenCalled();
	expect(resumeForChat).toHaveBeenCalledWith(expect.objectContaining({ resumeData }));
	expect(settleActionMessage).toHaveBeenCalledWith({
		agentId: 'agent-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		content,
	});
	if (background) {
		expect(resolve).not.toHaveBeenCalled();
		expect(resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				runId: 'background-job-96fa13fa-75db-4439-b7c8-cd04a2c2f9b7',
				toolCallId: 'abcdefghijklmnopqrstuv',
				resumeData,
			}),
		);
		expect(settleActionMessage.mock.invocationCallOrder[0]).toBeGreaterThan(
			resumeForChat.mock.invocationCallOrder[0],
		);
	} else {
		expect(settleActionMessage.mock.invocationCallOrder[0]).toBeLessThan(
			resumeForChat.mock.invocationCallOrder[0],
		);
	}
});
