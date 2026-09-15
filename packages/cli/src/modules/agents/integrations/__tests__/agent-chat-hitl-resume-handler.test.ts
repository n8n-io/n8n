import type { AgentTurnClaim, AgentTurnSubmitResult } from '../../agent-turn-queue.service';
import { AgentActionAlreadyHandledError } from '../../agent-action-already-handled.error';
import { AgentChatHitlResumeHandler } from '../agent-chat-hitl-resume-handler';

const channel = {
	integrationType: 'discord',
	credentialId: 'cred-1',
	thread: {
		_type: 'chat:Thread' as const,
		adapterName: 'discord',
		channelId: 'discord:800000000000000001:700000000000000001',
		id: 'discord:800000000000000001:700000000000000001:600000000000000001',
		isDM: false,
	},
};

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
	const resumeForChat = vi.fn(
		(
			_config: { beforeResume?: (abortSignal: AbortSignal) => Promise<void> },
			_claim: AgentTurnClaim,
		) => (async function* () {})(),
	);
	const claim: AgentTurnClaim = {
		executionId: 'exec-1',
		threadId: 'agent-thread-1',
		abortSignal: new AbortController().signal,
		release: vi.fn(async () => {}),
		fail: vi.fn(async () => {}),
	};
	const submitTurn = vi
		.fn<() => Promise<AgentTurnSubmitResult>>()
		.mockResolvedValue({ status: 'claimed', claim });
	const resolve = vi.fn().mockResolvedValue(callback);
	const handler = new AgentChatHitlResumeHandler({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: { type: 'discord', credentialId: 'cred-1' },
		agentService: {
			resumeForChat,
			resolveResumeThread: vi.fn().mockResolvedValue('agent-thread-1'),
		},
		turnQueueService: { submit: submitTurn },
		channelTurn: () => channel,
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
		thread: {
			id: 'discord:800000000000000001:700000000000000001:600000000000000001',
			adapter: { deleteMessage },
			post: vi.fn(),
		},
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
		submitTurn,
		claim,
		resolve,
		consume,
	};
}

const approvalCallback = {
	actionId: 'resume:run-1:tool-1:0',
	value: JSON.stringify({ approved: true }),
	kind: 'approval' as const,
};

it('stores a queued resume for the drain of the running turn', async () => {
	const { handler, event, submitTurn, resumeForChat, consume } = makeHandler(approvalCallback);
	submitTurn.mockResolvedValue({ status: 'queued', executionId: 'exec-2' });

	await handler.handleAction(event as never);

	expect(submitTurn).toHaveBeenCalledWith({
		threadId: 'agent-thread-1',
		agentId: 'agent-1',
		projectId: 'project-1',
		userMessage: null,
		source: 'discord',
		resourceId: null,
		runContext: {
			kind: 'resume',
			runId: 'run-1',
			toolCallId: 'tool-1',
			resumeData: { approved: true },
			channel: { ...channel, action: { actionId: 'callback-key', kind: 'approval' } },
		},
	});
	expect(resumeForChat).not.toHaveBeenCalled();
	expect(consume).not.toHaveBeenCalled();
	expect(event.thread.post).not.toHaveBeenCalled();
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
			claim,
			consume,
		} = makeHandler(callback);

		await handler.handleAction(event as never);

		expect(resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({ runId: 'run-1', toolCallId: 'tool-1' }),
			claim,
		);
		expect(consume).toHaveBeenCalledTimes(1);
		// The action stays unsettled until the admitted resume starts.
		expect(deleteMessage).not.toHaveBeenCalled();
		expect(settleActionMessage).not.toHaveBeenCalled();
		expect(updateLatest).not.toHaveBeenCalled();
		expect(resolve).not.toHaveBeenCalled();
		const { beforeResume } = resumeForChat.mock.calls[0][0];

		await beforeResume?.(claim.abortSignal);

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
	},
);

it('answers an immediate click rejected by the durable checkpoint', async () => {
	const { handler, event, resumeForChat, resolve, consume, settleActionMessage } = makeHandler({
		actionId: 'resume:run-1:tool-1:0',
		value: JSON.stringify({ approved: true }),
		kind: 'approval',
	});
	resumeForChat.mockImplementation(() =>
		// eslint-disable-next-line require-yield
		(async function* () {
			throw new AgentActionAlreadyHandledError();
		})(),
	);
	consume.mockImplementation(async (stream: AsyncGenerator) => {
		await stream.next();
	});

	await handler.handleAction(event as never);

	expect(event.thread.post).toHaveBeenCalledWith('This action has already been handled');
	expect(settleActionMessage).not.toHaveBeenCalled();
	expect(resolve).not.toHaveBeenCalled();
});
