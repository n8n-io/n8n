import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import type { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import { AgentResumeAlreadyHandledError } from '../../agent-resume-already-handled.error';
import { INTERACTIVE_RESUME_SESSION_WAIT_MS } from '../../agent-session-lease.service';
import { AgentTurnAlreadyRunningError } from '../../agent-turn-already-running.error';
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
		resolvePlatformThreadId: () =>
			'discord:800000000000000001:700000000000000001:600000000000000001',
		toAgentThreadId: () => ({ id: 'agent-thread-1' }) as never,
		getPlatformAgentContext: () => ({}),
		messageContextBridge: { capture: vi.fn().mockReturnValue(undefined) } as never,
		streamConsumer: { consume: vi.fn().mockResolvedValue(undefined) } as never,
		createResumeExecutionContext: async () => ({}),
		messageQueueEnabled: true,
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

describe('duplicate resumes', () => {
	function failingResume(error: Error) {
		// eslint-disable-next-line require-yield
		return vi.fn(async function* () {
			throw error;
		});
	}

	function createHandler(
		resumeForChat: AgentExecutionOrchestratorService['resumeForChat'],
		{ messageQueueEnabled = true } = {},
	) {
		return new AgentChatHitlResumeHandler({
			agentId: 'agent-1',
			projectId: 'project-1',
			integration: { type: 'slack', credentialId: 'cred-1' },
			agentService: { resumeForChat },
			logger: { warn: vi.fn() } as never,
			deleteActionMessageBeforeResume: false,
			resolvePlatformThreadId: () => 'slack:C1:1',
			toAgentThreadId: () => ({ id: 'agent-thread-1' }) as never,
			getPlatformAgentContext: () => ({}),
			messageContextBridge: { capture: vi.fn().mockReturnValue(undefined) } as never,
			streamConsumer: {
				consume: vi.fn(async (stream: AsyncGenerator<unknown>) => {
					for await (const _chunk of stream) {
						// Drain like the real consumer, so a start error surfaces here.
					}
				}),
			} as never,
			createResumeExecutionContext: async () => ({}),
			messageQueueEnabled,
		});
	}

	async function clickResumeButton(handler: AgentChatHitlResumeHandler, thread: { post: unknown }) {
		await handler.handleAction({
			actionId: 'resume:run-1:tool-1:0',
			value: JSON.stringify({ approved: true }),
			thread,
			threadId: 'slack:C1:1',
			messageId: 'message-1',
			user: { userId: 'user-1', userName: 'alice', fullName: 'Alice' },
			adapter: {},
			raw: {},
		} as never);
	}

	/** Starts a resume that runs until `release` resolves, then clicks the button again. */
	async function clickTwiceDuringResume(messageQueueEnabled: boolean) {
		const release = createDeferredPromise();
		const resumeForChat = vi.fn(() =>
			// eslint-disable-next-line require-yield
			(async function* () {
				await release.promise;
			})(),
		);
		const handler = createHandler(resumeForChat, { messageQueueEnabled });
		const firstThread = { post: vi.fn() };
		const secondThread = { post: vi.fn() };

		const first = clickResumeButton(handler, firstThread);
		await vi.waitFor(() => expect(resumeForChat).toHaveBeenCalledOnce());
		const second = clickResumeButton(handler, secondThread);
		await vi.waitFor(() =>
			expect(resumeForChat.mock.calls.length + secondThread.post.mock.calls.length).toBe(2),
		);
		release.resolve();
		await Promise.all([first, second]);
		return { resumeForChat, secondThread };
	}

	it('keeps a second click out in this process when the message queue flag is off', async () => {
		const { resumeForChat, secondThread } = await clickTwiceDuringResume(false);

		expect(resumeForChat).toHaveBeenCalledOnce();
		expect(secondThread.post).toHaveBeenCalledExactlyOnceWith(
			'This action has already been handled',
		);
	});

	it('leaves a second click to the session lease when the message queue flag is on', async () => {
		const { resumeForChat, secondThread } = await clickTwiceDuringResume(true);

		expect(resumeForChat).toHaveBeenCalledTimes(2);
		expect(secondThread.post).not.toHaveBeenCalled();
	});

	it('waits for the session before a button resume starts', async () => {
		const resumeForChat = vi.fn(() => (async function* () {})());
		const thread = { post: vi.fn() };

		await clickResumeButton(createHandler(resumeForChat), thread);

		expect(resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				runId: 'run-1',
				sessionWaitMs: INTERACTIVE_RESUME_SESSION_WAIT_MS,
			}),
		);
		expect(thread.post).not.toHaveBeenCalled();
	});

	it.each([
		['the session stays busy after the wait', new AgentTurnAlreadyRunningError()],
		['another click already handled the action', new AgentResumeAlreadyHandledError()],
	])('tells the user the action is handled when %s', async (_label, error) => {
		const thread = { post: vi.fn() };

		await clickResumeButton(createHandler(failingResume(error)), thread);

		expect(thread.post).toHaveBeenCalledExactlyOnceWith('This action has already been handled');
	});

	it('returns a duplicate resume error to a caller that does not notify', async () => {
		const error = new AgentTurnAlreadyRunningError();
		const thread = { post: vi.fn() };

		await expect(
			createHandler(failingResume(error)).executeResume(
				thread as never,
				'run-1',
				'tool-1',
				{},
				{ notifyOnDuplicate: false },
			),
		).rejects.toBe(error);
		expect(thread.post).not.toHaveBeenCalled();
	});
});
