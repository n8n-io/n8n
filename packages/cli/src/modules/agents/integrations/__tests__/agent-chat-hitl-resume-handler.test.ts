import type { Author } from 'chat';

import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';

const THREAD_ID = 'discord:800000000000000001:700000000000000001:600000000000000001';
const ALICE: Author = {
	userId: 'user-1',
	userName: 'alice',
	fullName: 'Alice',
} as Author;

type HandlerOptions = ConstructorParameters<typeof AgentChatHitlResumeHandler>[0];

function createHandler(overrides: Partial<HandlerOptions> = {}) {
	return new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: { resumeForChat: vi.fn(() => (async function* () {})()) },
		logger: { warn: vi.fn() } as never,
		deleteActionMessageBeforeResume: false,
		resolvePlatformThreadId: () => THREAD_ID,
		toAgentThreadId: () => ({ id: 'agent-thread-1' }) as never,
		getPlatformAgentContext: () => ({}),
		messageContextBridge: { capture: vi.fn().mockReturnValue(undefined) } as never,
		streamConsumer: { consume: vi.fn().mockResolvedValue(undefined) } as never,
		createResumeExecutionContext: async () => ({}),
		...overrides,
	} as HandlerOptions);
}

describe('settling the action card', () => {
	it.each([
		{
			name: 'approval',
			callback: {
				actionId: 'resume:run-1:tool-1:0',
				value: JSON.stringify({ approved: true }),
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
		// Teams and any other platform that carries the full payload in the card:
		// the decision is in the button value, so no store is needed to name it.
		{
			name: 'store-less approval',
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			content: '✅ Approved by Alice',
		},
		{
			name: 'store-less decline',
			actionId: 'resume:run-1:tool-1:1',
			value: JSON.stringify({ approved: false }),
			content: '🚫 Declined by Alice',
		},
	])(
		'names the decision on a $name card before resuming the agent',
		async ({ callback, actionId = 'callback-key', value, content }) => {
			const settleActionMessage = vi.fn().mockResolvedValue(undefined);
			const deleteMessage = vi.fn().mockResolvedValue(undefined);
			const resumeForChat = vi.fn(() => (async function* () {})());
			const handler = createHandler({
				agentService: { resumeForChat },
				...(callback
					? { callbackStore: { resolve: vi.fn().mockResolvedValue(callback) } as never }
					: {}),
				formatActionDecisionMessage: ({ approved, selectedLabel, user }) => {
					if (approved === undefined) return `✅ ${selectedLabel} selected by ${user.fullName}`;
					return approved ? `✅ Approved by ${user.fullName}` : `🚫 Declined by ${user.fullName}`;
				},
				settleActionMessage,
			});

			await handler.handleAction({
				actionId,
				value,
				thread: { post: vi.fn() },
				threadId: THREAD_ID,
				messageId: 'message-1',
				user: ALICE,
				adapter: { deleteMessage },
				raw: {},
			} as never);

			expect(deleteMessage).not.toHaveBeenCalled();
			expect(settleActionMessage).toHaveBeenCalledWith({
				agentId: 'agent-1',
				integration: { type: 'discord', credentialId: 'cred-1' },
				threadId: THREAD_ID,
				messageId: 'message-1',
				content,
			});
			expect(settleActionMessage.mock.invocationCallOrder[0]).toBeLessThan(
				resumeForChat.mock.invocationCallOrder[0],
			);
		},
	);
});
