import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';

it('settles an approval card in place before resuming the agent', async () => {
	const settleApprovalMessage = vi.fn().mockResolvedValue(undefined);
	const deleteMessage = vi.fn().mockResolvedValue(undefined);
	const resumeForChat = vi.fn(() => (async function* () {})());
	const handler = new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: { resumeForChat },
		logger: { warn: vi.fn() } as never,
		callbackStore: {
			resolve: vi.fn().mockResolvedValue({
				actionId: 'resume:run-1:tool-1:0',
				value: JSON.stringify({ approved: true }),
				kind: 'approval',
			}),
		} as never,
		deleteActionMessageBeforeResume: false,
		formatApprovalDecisionMessage: () => '✅ Approved by Alice',
		settleApprovalMessage,
		resolvePlatformThreadId: () =>
			'discord:800000000000000001:700000000000000001:600000000000000001',
		toAgentThreadId: () => ({ id: 'agent-thread-1' }) as never,
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
	expect(settleApprovalMessage).toHaveBeenCalledWith({
		agentId: 'agent-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: 'message-1',
		content: '✅ Approved by Alice',
	});
	expect(settleApprovalMessage.mock.invocationCallOrder[0]).toBeLessThan(
		resumeForChat.mock.invocationCallOrder[0],
	);
});
