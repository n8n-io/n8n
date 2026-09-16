import { isRecord } from '@n8n/utils/is-record';

import { createTeamsReplayContext } from '../../../__tests__/helpers/teams/replay-test-context';
import {
	cardAction,
	channelFollowUp,
	channelMention,
	channelSecondThreadMention,
	dmFollowUp,
	dmMessage,
	groupChatFollowUp,
	groupChatMention,
	selfMessage,
	TEAMS_CHANNEL_CONVERSATION_ID,
	TEAMS_DM_CONVERSATION_ID,
	TEAMS_GROUP_CHAT_CONVERSATION_ID,
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

function cardActions(body: unknown): Array<Record<string, unknown>> {
	const found: Array<Record<string, unknown>> = [];
	const visit = (node: unknown) => {
		if (Array.isArray(node)) return node.forEach(visit);
		if (!isRecord(node)) return;
		if (node.type === 'Action.Submit') found.push(node);
		Object.values(node).forEach(visit);
	};
	visit(body);
	return found;
}

describe('Microsoft Teams integration scenarios', () => {
	it('rejects an activity that carries no Bot Framework token', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			const response = await ctx.sendUnauthenticatedWebhook(dmMessage);

			expect(response.status).toBe(401);
			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		} finally {
			await ctx.shutdown();
		}
	});

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

			const actions = cardActions(ctx.lastPost()?.body);
			expect(actions.map((action) => action.title)).toEqual(['Staging', 'Production']);
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

			const cardPost = ctx.lastPost();
			const cardMessageId = ctx.lastPostedMessageId();
			if (!cardMessageId) throw new Error('Expected the approval card to have been posted');
			const actions = cardActions(cardPost?.body);
			const approve = actions[0];
			if (!approve) throw new Error('Expected an Adaptive Card action on the approval card');

			ctx.nextStream([
				{ type: 'text-delta', id: 'resume-text', delta: 'Card handled' },
				{ type: 'finish', finishReason: 'stop' },
			]);
			await ctx.sendWebhook(cardAction(approve.data as Record<string, unknown>, cardMessageId));

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					runId: 'run-card-1',
					toolCallId: 'tool-card-1',
					integrationType: 'teams',
				}),
			);

			// Generic wording: no CallbackStore, so no decision reaches the formatter.
			expect(ctx.lastEdit()?.body).toMatchObject({
				text: '✅ Action selected by Alice',
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('routes a team channel mention to the agent and replies in the same thread', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await expect(ctx.sendWebhook(channelMention)).resolves.toMatchObject({ status: 200 });

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: '@n8n Agent hello agent',
					author: { id: TEAMS_USER_ID, name: 'Alice' },
					integrationType: 'teams',
				}),
			);
			expect(ctx.lastPost()?.body).toMatchObject({
				type: 'message',
				text: 'Got it',
				conversation: { id: TEAMS_CHANNEL_CONVERSATION_ID },
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('routes an unmentioned follow-up in a subscribed channel thread to the same session', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await ctx.sendWebhook(channelMention);
			const firstThreadId = ctx.latestThreadId();

			await ctx.sendWebhook(channelFollowUp);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({ message: 'follow up' }),
			);
			expect(ctx.latestThreadId()).toBe(firstThreadId);
		} finally {
			await ctx.shutdown();
		}
	});

	it('keeps a separate session for each thread in the same channel', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await ctx.sendWebhook(channelMention);
			const firstThreadId = ctx.latestThreadId();

			await ctx.sendWebhook(channelSecondThreadMention);

			expect(ctx.latestThreadId()).not.toBe(firstThreadId);
		} finally {
			await ctx.shutdown();
		}
	});

	it('keeps one session for a whole group chat', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await ctx.sendWebhook(groupChatMention);
			const firstThreadId = ctx.latestThreadId();

			expect(ctx.lastPost()?.body).toMatchObject({
				conversation: { id: TEAMS_GROUP_CHAT_CONVERSATION_ID },
			});

			await ctx.sendWebhook(groupChatFollowUp);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.latestThreadId()).toBe(firstThreadId);
		} finally {
			await ctx.shutdown();
		}
	});

	it('resumes a suspended approval from a card click in a channel thread', async () => {
		const ctx = await createTeamsReplayContext({
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-channel-card-1',
					toolCallId: 'tool-channel-card-1',
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
			await ctx.sendWebhook(channelMention);

			const cardMessageId = ctx.lastPostedMessageId();
			if (!cardMessageId) throw new Error('Expected the approval card to have been posted');
			const approve = cardActions(ctx.lastPost()?.body)[0];
			if (!approve) throw new Error('Expected an Adaptive Card action on the approval card');

			ctx.nextStream([
				{ type: 'text-delta', id: 'resume-text', delta: 'Card handled' },
				{ type: 'finish', finishReason: 'stop' },
			]);
			await ctx.sendWebhook(
				cardAction(
					approve.data as Record<string, unknown>,
					cardMessageId,
					channelMention.conversation,
				),
			);

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					runId: 'run-channel-card-1',
					toolCallId: 'tool-channel-card-1',
					integrationType: 'teams',
				}),
			);
		} finally {
			await ctx.shutdown();
		}
	});
});
