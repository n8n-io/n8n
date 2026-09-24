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

function createThread(nativeEphemeral: boolean) {
	return {
		post: vi.fn().mockResolvedValue(undefined),
		postEphemeral: vi
			.fn()
			.mockResolvedValue(nativeEphemeral ? { id: 'ephemeral-1', usedFallback: false } : null),
	};
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
				thread: createThread(true),
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

describe('notices that answer one click', () => {
	const EXPIRED_NOTICE =
		'This action is no longer available. The link may have expired or already been used.';

	it('tells only the clicking user that their callback key expired', async () => {
		const thread = createThread(true);
		const resumeForChat = vi.fn(() => (async function* () {})());
		const handler = createHandler({
			agentService: { resumeForChat },
			callbackStore: { resolve: vi.fn().mockResolvedValue(undefined) } as never,
		});

		await handler.handleAction({
			actionId: 'callback-key',
			thread,
			threadId: THREAD_ID,
			messageId: 'message-1',
			user: ALICE,
			adapter: { deleteMessage: vi.fn() },
			raw: {},
		} as never);

		expect(thread.postEphemeral).toHaveBeenCalledWith(ALICE, EXPIRED_NOTICE, {
			fallbackToDM: false,
		});
		expect(thread.post).not.toHaveBeenCalled();
		expect(resumeForChat).not.toHaveBeenCalled();
	});

	it('falls back to the thread when the ephemeral post is rejected', async () => {
		const thread = {
			post: vi.fn().mockResolvedValue(undefined),
			postEphemeral: vi.fn().mockRejectedValue(new Error('rate limited')),
		};
		const handler = createHandler({
			callbackStore: { resolve: vi.fn().mockResolvedValue(undefined) } as never,
		});

		await handler.handleAction({
			actionId: 'callback-key',
			thread,
			threadId: THREAD_ID,
			messageId: 'message-1',
			user: ALICE,
			adapter: { deleteMessage: vi.fn() },
			raw: {},
		} as never);

		expect(thread.post).toHaveBeenCalledWith(EXPIRED_NOTICE);
	});

	it('falls back to the thread where the platform has no ephemeral message', async () => {
		const thread = createThread(false);
		const handler = createHandler({
			callbackStore: { resolve: vi.fn().mockResolvedValue(undefined) } as never,
		});

		await handler.handleAction({
			actionId: 'callback-key',
			thread,
			threadId: THREAD_ID,
			messageId: 'message-1',
			user: ALICE,
			adapter: { deleteMessage: vi.fn() },
			raw: {},
		} as never);

		expect(thread.post).toHaveBeenCalledWith(EXPIRED_NOTICE);
	});

	it('tells only the clicking user that the action was already handled', async () => {
		const thread = createThread(true);
		// Hold the first resume open so the second one meets the in-flight guard.
		let releaseFirstResume!: () => void;
		const firstResumeHeld = new Promise<void>((resolve) => {
			releaseFirstResume = resolve;
		});
		const handler = createHandler({
			streamConsumer: { consume: async () => await firstResumeHeld } as never,
		});

		const first = handler.executeResume(
			thread as never,
			'run-1',
			'tool-1',
			{},
			{
				actingUser: ALICE,
			},
		);
		await handler.executeResume(thread as never, 'run-1', 'tool-1', {}, { actingUser: ALICE });
		releaseFirstResume();
		await first;

		expect(thread.postEphemeral).toHaveBeenCalledWith(
			ALICE,
			'This action has already been handled',
			{
				fallbackToDM: false,
			},
		);
		expect(thread.post).not.toHaveBeenCalled();
	});

	it('stays silent on a resume no user triggered', async () => {
		const thread = createThread(true);
		let releaseFirstResume!: () => void;
		const firstResumeHeld = new Promise<void>((resolve) => {
			releaseFirstResume = resolve;
		});
		const handler = createHandler({
			streamConsumer: { consume: async () => await firstResumeHeld } as never,
		});

		const first = handler.executeResume(thread as never, 'run-1', 'tool-1', {});
		await handler.executeResume(thread as never, 'run-1', 'tool-1', {});
		releaseFirstResume();
		await first;

		expect(thread.postEphemeral).not.toHaveBeenCalled();
		expect(thread.post).not.toHaveBeenCalled();
	});

	it('tells the clicking user when the run behind the card is gone', async () => {
		const thread = createThread(true);
		const resumeForChat = vi.fn(() => (async function* () {})());
		const settleActionMessage = vi.fn().mockResolvedValue(undefined);
		const handler = createHandler({
			agentService: { resumeForChat, isResumable: async () => false },
			formatActionDecisionMessage: () => 'never settled',
			settleActionMessage,
		});

		await handler.handleAction({
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			thread,
			threadId: THREAD_ID,
			messageId: 'message-1',
			user: ALICE,
			adapter: { deleteMessage: vi.fn() },
			raw: {},
		} as never);

		expect(thread.postEphemeral).toHaveBeenCalledWith(ALICE, EXPIRED_NOTICE, {
			fallbackToDM: false,
		});
		// No resume, so the misconfiguration error never reaches the thread.
		expect(resumeForChat).not.toHaveBeenCalled();
		expect(settleActionMessage).not.toHaveBeenCalled();
	});

	it('removes a stale card on a platform that deletes answered ones', async () => {
		const thread = createThread(true);
		const deleteMessage = vi.fn().mockResolvedValue(undefined);
		const handler = createHandler({
			agentService: {
				resumeForChat: vi.fn(() => (async function* () {})()),
				isResumable: async () => false,
			},
			deleteActionMessageBeforeResume: true,
		});

		await handler.handleAction({
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			thread,
			threadId: THREAD_ID,
			messageId: 'message-1',
			user: ALICE,
			adapter: { deleteMessage },
			raw: {},
		} as never);

		expect(deleteMessage).toHaveBeenCalledWith(THREAD_ID, 'message-1');
	});

	it('resumes when the run is still resumable', async () => {
		const thread = createThread(true);
		const resumeForChat = vi.fn(() => (async function* () {})());
		const handler = createHandler({
			agentService: { resumeForChat, isResumable: async () => true },
		});

		await handler.handleAction({
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			thread,
			threadId: THREAD_ID,
			messageId: 'message-1',
			user: ALICE,
			adapter: { deleteMessage: vi.fn() },
			raw: {},
		} as never);

		expect(resumeForChat).toHaveBeenCalled();
		expect(thread.postEphemeral).not.toHaveBeenCalled();
	});

	it('removes an answered card on a platform that deletes them, then resumes', async () => {
		const thread = createThread(true);
		const resumeForChat = vi.fn(() => (async function* () {})());
		const deleteMessage = vi.fn().mockResolvedValue(undefined);
		const settleActionMessage = vi.fn();
		const handler = createHandler({
			agentService: { resumeForChat, isResumable: async () => true },
			deleteActionMessageBeforeResume: true,
			settleActionMessage,
		});

		await handler.handleAction({
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			thread,
			threadId: THREAD_ID,
			messageId: 'message-1',
			user: ALICE,
			adapter: { deleteMessage },
			raw: {},
		} as never);

		expect(deleteMessage).toHaveBeenCalledWith(THREAD_ID, 'message-1');
		expect(settleActionMessage).not.toHaveBeenCalled();
		expect(resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({ runId: 'run-1', resumeData: { approved: true } }),
		);
	});
});
