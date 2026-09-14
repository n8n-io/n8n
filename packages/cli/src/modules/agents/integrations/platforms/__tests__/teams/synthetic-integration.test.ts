import { createTeamsReplayContext } from '../../../__tests__/helpers/teams/replay-test-context';
import {
	cardAction,
	dmFollowUp,
	dmMessage,
	selfMessage,
	TEAMS_DM_CONVERSATION_ID,
	TEAMS_USER_ID,
} from '../../../__tests__/helpers/teams/synthetic-fixtures';

// The chat SDK + adapters are ESM-only. Production loads them via esm-loader's
// `new Function()` hack to dodge the CJS transform, which can't run under vitest;
// redirect the loaders to native dynamic imports so the real adapter is used.
vi.mock('../../../esm-loader', () => ({
	loadChatSdk: async () => await import('chat'),
	loadMemoryState: async () => await import('@chat-adapter/state-memory'),
	loadTeamsAdapter: async () => await import('@chat-adapter/teams'),
}));

/** Pull the Adaptive Card attachment off a recorded outbound activity. */
function adaptiveCardFrom(body: Record<string, unknown> | undefined) {
	const attachments = body?.attachments;
	if (!Array.isArray(attachments)) return undefined;
	const card = attachments.find(
		(a: unknown) =>
			typeof a === 'object' &&
			a !== null &&
			(a as { contentType?: string }).contentType === 'application/vnd.microsoft.card.adaptive',
	);
	return (card as { content?: Record<string, unknown> } | undefined)?.content;
}

/** Every `Action.Submit` on an Adaptive Card, flattened across actionsets. */
function cardActions(card: Record<string, unknown> | undefined): Array<Record<string, unknown>> {
	const collect = (nodes: unknown): Array<Record<string, unknown>> => {
		if (!Array.isArray(nodes)) return [];
		return nodes.flatMap((node) => {
			if (typeof node !== 'object' || node === null) return [];
			const record = node as Record<string, unknown>;
			const own = record.type === 'Action.Submit' ? [record] : [];
			return [
				...own,
				...collect(record.actions),
				...collect(record.items),
				...collect(record.body),
			];
		});
	};
	return [...collect(card?.actions), ...collect(card?.body)];
}

describe('Microsoft Teams integration scenarios', () => {
	it('routes a Teams direct message to the agent and replies in the same conversation', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await expect(ctx.sendWebhook(dmMessage)).resolves.toMatchObject({ status: 200 });

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					message: 'hello agent',
					author: { id: TEAMS_USER_ID, name: 'Alice' },
					integrationType: 'teams',
				}),
			);
			expect(ctx.lastPost()?.body).toMatchObject({
				type: 'message',
				text: 'Got it',
				conversation: { id: TEAMS_DM_CONVERSATION_ID },
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('routes a follow-up in the same direct message conversation to the same session', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await ctx.sendWebhook(dmMessage);
			const firstThreadId = ctx.latestThreadId();

			await ctx.sendWebhook(dmFollowUp);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({ message: 'follow up' }),
			);
			expect(ctx.latestThreadId()).toBe(firstThreadId);
		} finally {
			await ctx.shutdown();
		}
	});

	it('ignores a message the bot itself authored', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await ctx.sendWebhook(selfMessage);

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
			expect(ctx.lastPost()).toBeUndefined();
		} finally {
			await ctx.shutdown();
		}
	});

	it('renders a suspended select as individual Adaptive Card buttons', async () => {
		const ctx = await createTeamsReplayContext({
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-select-1',
					toolCallId: 'tool-select-1',
					toolName: 'select',
					suspendPayload: {
						type: 'form',
						toolName: 'pick_environment',
						displayName: 'Pick an environment',
						components: [
							{
								type: 'select',
								label: 'Environment',
								options: [
									{ label: 'Staging', value: 'staging' },
									{ label: 'Production', value: 'production' },
								],
							},
						],
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(dmMessage);

			const actions = cardActions(adaptiveCardFrom(ctx.lastPost()?.body));
			expect(actions.map((action) => action.title)).toEqual(
				expect.arrayContaining(['Staging', 'Production']),
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it('resumes a suspended approval from an Adaptive Card button click', async () => {
		const ctx = await createTeamsReplayContext({
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-card-1',
					toolCallId: 'tool-card-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'send_teams_message',
						displayName: 'Send Teams message',
						args: { text: 'Continue?' },
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(dmMessage);

			const actions = cardActions(adaptiveCardFrom(ctx.lastPost()?.body));
			const approve = actions[0];
			if (!approve) throw new Error('Expected an Adaptive Card action on the approval card');

			ctx.nextStream([
				{ type: 'text-delta', id: 'resume-text', delta: 'Card handled' },
				{ type: 'finish', finishReason: 'stop' },
			]);
			await ctx.sendWebhook(cardAction(approve.data as Record<string, unknown>));

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					runId: 'run-card-1',
					toolCallId: 'tool-card-1',
					integrationType: 'teams',
				}),
			);
		} finally {
			await ctx.shutdown();
		}
	});
});
