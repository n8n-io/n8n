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
	legacyGroupChatFollowUp,
	legacyGroupChatMention,
	selfMessage,
	TEAMS_CHANNEL_CONVERSATION_ID,
	TEAMS_DM_CONVERSATION_ID,
	TEAMS_GROUP_CHAT_CONVERSATION_ID,
	TEAMS_LEGACY_GROUP_CHAT_CONVERSATION_ID,
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
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);

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
					// What the approval gate really sends: APPROVAL_RESUME_SCHEMA as
					// JSON Schema. Without it the mapper encodes the button value as a
					// bare string, and no decision reaches the formatter.
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
						required: ['approved'],
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
					resumeData: { approved: true },
				}),
			);

			// Removed rather than relabelled, so a stale button cannot be clicked.
			expect(ctx.lastDelete()?.body.uri).toContain(cardMessageId);
			expect(ctx.lastEdit()).toBeUndefined();
		} finally {
			await ctx.shutdown();
		}
	});

	it('addresses a group chat approval card at the user who asked', async () => {
		const ctx = await createTeamsReplayContext({
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-group-1',
					toolCallId: 'tool-group-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'send_teams_message',
						displayName: 'Send Teams message',
						args: { text: 'Continue?' },
					},
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
						required: ['approved'],
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(groupChatMention);

			const cardPost = ctx.lastPost();
			expect(cardPost?.body).toMatchObject({
				conversation: { id: TEAMS_GROUP_CHAT_CONVERSATION_ID },
				// A Teams targeted message: delivered to this user alone.
				recipient: { id: TEAMS_USER_ID },
			});
			expect(cardActions(cardPost?.body)).not.toHaveLength(0);
		} finally {
			await ctx.shutdown();
		}
	});

	it('removes an answered targeted card', async () => {
		const ctx = await createTeamsReplayContext({
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-group-1',
					toolCallId: 'tool-group-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'send_teams_message',
						displayName: 'Send Teams message',
						args: { text: 'Continue?' },
					},
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
						required: ['approved'],
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(groupChatMention);
			const cardMessageId = ctx.lastPostedMessageId();
			if (!cardMessageId) throw new Error('Expected the approval card to have been posted');
			const approve = cardActions(ctx.lastPost()?.body)[0];
			if (!approve) throw new Error('Expected an Adaptive Card action on the approval card');

			ctx.nextStream([{ type: 'finish', finishReason: 'stop' }]);
			await ctx.sendWebhook(
				cardAction(approve.data as Record<string, unknown>, cardMessageId, groupChatMention),
			);

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					runId: 'run-group-1',
					toolCallId: 'tool-group-1',
					resumeData: { approved: true },
				}),
			);

			// A targeted card is only mutable through the targeted endpoint, so the
			// answered one is deleted there rather than settled in place.
			expect(ctx.lastDelete()?.body.uri).toContain(cardMessageId);
			expect(ctx.lastDelete()?.body.uri).toContain('isTargetedActivity=true');
			expect(ctx.lastEdit()).toBeUndefined();
		} finally {
			await ctx.shutdown();
		}
	});

	it('answers a click on a card whose run is gone, privately', async () => {
		const ctx = await createTeamsReplayContext({
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-group-1',
					toolCallId: 'tool-group-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'send_teams_message',
						displayName: 'Send Teams message',
						args: { text: 'Continue?' },
					},
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
						required: ['approved'],
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(groupChatMention);
			const cardMessageId = ctx.lastPostedMessageId();
			if (!cardMessageId) throw new Error('Expected the approval card to have been posted');
			const approve = cardActions(ctx.lastPost()?.body)[0];
			if (!approve) throw new Error('Expected an Adaptive Card action on the approval card');

			ctx.agentExecutor.isResumable.mockResolvedValue(false);
			await ctx.sendWebhook(
				cardAction(approve.data as Record<string, unknown>, cardMessageId, groupChatMention),
			);

			// No decision took effect, so the click is answered rather than resumed.
			expect(ctx.agentExecutor.resumeForChat).not.toHaveBeenCalled();
			expect(ctx.lastDelete()?.body.uri).toContain(cardMessageId);

			const notice = ctx.lastPost();
			expect(notice?.body).toMatchObject({
				conversation: { id: TEAMS_GROUP_CHAT_CONVERSATION_ID },
				// Targeted, so the rest of the group chat never sees it.
				recipient: { id: TEAMS_USER_ID },
			});
			expect(notice?.body.text).toContain('This action is no longer available');
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
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);

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

			// One run for one mention: Teams retries an activity that the adapter
			// leaves unanswered, and a retry would show up as a second run here.
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			expect(ctx.lastPost()?.body).toMatchObject({
				conversation: { id: TEAMS_GROUP_CHAT_CONVERSATION_ID },
			});

			await ctx.sendWebhook(groupChatFollowUp);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({ message: 'follow up' }),
			);
			expect(ctx.latestThreadId()).toBe(firstThreadId);
		} finally {
			await ctx.shutdown();
		}
	});

	it('reads a group chat whose id does not start with 19: as a group chat', async () => {
		const { decodeThreadId } = await import('@chat-adapter/teams');
		const ctx = await createTeamsReplayContext();
		try {
			await ctx.sendWebhook(legacyGroupChatMention);
			const firstThreadId = ctx.latestThreadId();

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			// Without the explicit conversation type the adapter would read this id
			// as a direct message, and then hold the webhook response open for the
			// whole agent run. The thread id carries the agent prefix, so decode
			// only the platform part.
			const platformThreadId = (firstThreadId ?? '').slice((firstThreadId ?? '').indexOf('teams:'));
			expect(decodeThreadId(platformThreadId)).toMatchObject({
				conversationId: TEAMS_LEGACY_GROUP_CHAT_CONVERSATION_ID,
				conversationType: 'groupChat',
			});

			await ctx.sendWebhook(legacyGroupChatFollowUp);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({ message: 'follow up' }),
			);
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
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
						required: ['approved'],
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
				cardAction(approve.data as Record<string, unknown>, cardMessageId, channelMention),
			);

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					runId: 'run-channel-card-1',
					toolCallId: 'tool-channel-card-1',
					integrationType: 'teams',
					resumeData: { approved: true },
				}),
			);
			// The resume payload carries no thread id, so the outbound reply is what
			// proves the resumed run stayed in the channel thread.
			expect(ctx.lastPost()?.body).toMatchObject({
				conversation: { id: TEAMS_CHANNEL_CONVERSATION_ID },
			});
			// Removed rather than relabelled, so a stale button cannot be clicked.
			expect(ctx.lastDelete()?.body.uri).toContain(cardMessageId);
		} finally {
			await ctx.shutdown();
		}
	});
});
