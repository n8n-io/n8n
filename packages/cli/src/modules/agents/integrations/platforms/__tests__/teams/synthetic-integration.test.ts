import type { StreamChunk } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { isRecord } from '@n8n/utils/is-record';
import { mock } from 'vitest-mock-extended';

import type { AgentRepository } from '../../../../repositories/agent.repository';
import { ChatIntegrationRegistry } from '../../../agent-chat-integration';
import { ChannelRateLimitGuard } from '../../../channel-rate-limit.guard';
import type { ChatIntegrationService } from '../../../chat-integration.service';
import { ChatIntegrationActionExecutor } from '../../../integration-action-executor';
import { getIntegrationToolConnectionDescriptors } from '../../../integration-tools';
import { TeamsIntegration } from '../../teams/teams-integration';

import {
	createTeamsReplayContext,
	streamInfo,
} from '../../../__tests__/helpers/teams/replay-test-context';
import {
	cardAction,
	channelBotPost,
	channelFollowUp,
	channelMention,
	channelRootPost,
	channelSecondThreadMention,
	channelUnjoinedReply,
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

const READ_ALL = {
	teamChannels: true,
	readAllChannelMessages: true,
	groupChats: true,
	readAllGroupMessages: true,
};

const SILENT: StreamChunk[] = [{ type: 'finish', finishReason: 'stop' }];

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
			// A direct message renders progressively, so the text lands as an edit
			// of the placeholder rather than on the first post.
			expect(ctx.lastPost()?.body).toMatchObject({
				type: 'message',
				conversation: { id: TEAMS_DM_CONVERSATION_ID },
			});
			expect(ctx.lastEdit()?.body).toMatchObject({ text: 'Got it' });
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
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
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
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
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
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
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

const threeDeltas: StreamChunk[] = [
	{ type: 'text-delta', id: 't-1', delta: 'Looking ' },
	{ type: 'text-delta', id: 't-1', delta: 'into it ' },
	{ type: 'text-delta', id: 't-1', delta: 'now' },
	{ type: 'finish', finishReason: 'stop' },
];

describe('Microsoft Teams streaming', () => {
	it('renders a direct message reply progressively, then settles on the full text', async () => {
		// A gap between deltas so the renderer's timer actually ticks; without one
		// the whole reply drains before the first interval and only the final edit
		// runs, which would not exercise progressive rendering at all.
		const ctx = await createTeamsReplayContext({ stream: threeDeltas, streamGapMs: 40 });
		try {
			await ctx.sendWebhook(dmMessage);

			const activities = ctx.activities();
			// Teams' own streaming protocol needs a handle that only exists while
			// the inbound request is open, so this is post-and-edit instead.
			expect(activities.every((call) => streamInfo(call.body) === undefined)).toBe(true);

			const posts = activities.filter((call) => call.body.type === 'message');
			expect(posts).toHaveLength(1);
			expect(posts[0].body.text).toBe('…');

			const edits = ctx.edits().map((call) => String(call.body.text));
			expect(edits.length).toBeGreaterThan(1);
			// Each edit carries what came before it, ending on the whole reply.
			expect(edits.at(-1)).toBe('Looking into it now');
			expect(edits.at(-1)?.startsWith(edits[0])).toBe(true);
		} finally {
			await ctx.shutdown();
		}
	});

	it('still delivers the reply when every edit is rejected', async () => {
		const ctx = await createTeamsReplayContext({
			stream: threeDeltas,
			streamGapMs: 40,
			// Nothing reaches the placeholder, so the reply would be lost behind it.
			succeedingEdits: 0,
		});
		try {
			await expect(ctx.sendWebhook(dmMessage)).resolves.toMatchObject({ status: 200 });

			const texts = ctx
				.activities()
				.map((call) => call.body.text)
				.filter((text): text is string => typeof text === 'string');
			expect(texts).toContain('Looking into it now');
		} finally {
			await ctx.shutdown();
		}
	});

	/**
	 * The known cost of that recovery. The SDK guards its interval edits but not
	 * its last one, and it reports one promise for all of them, so a turn whose
	 * earlier edits landed cannot be told apart from one where nothing did. The
	 * reply is repeated rather than lost, which is the better of the two.
	 */
	it('repeats a reply whose earlier edits landed before one was rejected', async () => {
		const ctx = await createTeamsReplayContext({
			stream: threeDeltas,
			streamGapMs: 40,
			succeedingEdits: 1,
		});
		try {
			await ctx.sendWebhook(dmMessage);

			// The edit that landed left part of the reply in the placeholder.
			const edits = ctx.edits().map((call) => String(call.body.text));
			expect(edits[0]).not.toBe('');
			expect('Looking into it now'.startsWith(edits[0])).toBe(true);

			// The whole reply then arrives again, as its own message.
			const messages = ctx
				.activities()
				.filter((call) => call.body.type === 'message' && call.body.text !== '…');
			expect(messages).toHaveLength(1);
			expect(messages[0].body.text).toBe('Looking into it now');
		} finally {
			await ctx.shutdown();
		}
	});

	it('shows a plain typing indicator before the reply starts', async () => {
		const ctx = await createTeamsReplayContext({ stream: threeDeltas });
		try {
			await ctx.sendWebhook(dmMessage);

			const activities = ctx.activities();
			const indicators = activities.filter(
				(call) => call.body.type === 'typing' && !streamInfo(call.body),
			);
			expect(indicators).toHaveLength(1);
			// It has to arrive before anything else, or it tells the user nothing.
			expect(activities.indexOf(indicators[0])).toBe(0);
		} finally {
			await ctx.shutdown();
		}
	});

	it('sends a channel reply as one message, with no placeholder and no edits', async () => {
		const ctx = await createTeamsReplayContext({ stream: threeDeltas });
		try {
			await ctx.sendWebhook(channelMention);

			const messages = ctx.activities().filter((call) => call.body.type === 'message');
			expect(messages).toHaveLength(1);
			expect(messages[0].body.text).toContain('Looking into it now');
			expect(ctx.edits()).toHaveLength(0);
		} finally {
			await ctx.shutdown();
		}
	});

	it('posts text after a card as its own message', async () => {
		const ctx = await createTeamsReplayContext({
			stream: [
				{ type: 'text-delta', id: 't-1', delta: 'Deploying now.' },
				{
					type: 'tool-call-suspended',
					runId: 'run-order-1',
					toolCallId: 'tool-order-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'send_teams_message',
						displayName: 'Send Teams message',
						args: { text: 'Continue?' },
					},
				},
				{ type: 'text-delta', id: 't-2', delta: 'Waiting on you.' },
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(dmMessage);

			// The trailing text is its own message rather than an edit folded back
			// into the bubble that sits above the card.
			const trailing = ctx
				.activities()
				.filter(
					(call) =>
						call.body.type === 'message' &&
						typeof call.body.text === 'string' &&
						call.body.text.includes('Waiting on you.'),
				);
			expect(trailing).toHaveLength(1);
		} finally {
			await ctx.shutdown();
		}
	});
});

describe('Microsoft Teams messages without a mention', () => {
	it('runs a new channel post and a reply in an unjoined thread, with an optional reply', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
		try {
			await ctx.sendWebhook(channelRootPost);
			expect(ctx.latestContext()?.replyExpectation).toBe('optional');
			// The same published-chat run a mention gets, so the agent budget applies.
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'agent-1', integrationType: 'teams' }),
			);

			await ctx.sendWebhook(channelUnjoinedReply);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.latestContext()?.replyExpectation).toBe('optional');
		} finally {
			await ctx.shutdown();
		}
	});

	it('runs an unmentioned group chat message', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
		try {
			await ctx.sendWebhook(groupChatFollowUp);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			expect(ctx.latestContext()?.replyExpectation).toBe('optional');
		} finally {
			await ctx.shutdown();
		}
	});

	it.each([
		['a new post', [channelRootPost]],
		['a follow-up in a joined thread', [channelMention, channelFollowUp]],
	])('tells the model to answer %s as plain text, not through respond', async (_label, posts) => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
		try {
			for (const post of posts) await ctx.sendWebhook(post);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({
					modelMessage: expect.stringContaining('Do not use the respond action for it.'),
				}),
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it('tells the model that a message without a mention may go unanswered', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
		try {
			await ctx.sendWebhook(channelRootPost);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'anyone seen the build fail?',
					modelMessage: expect.stringContaining('do_not_respond'),
				}),
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it('tells the model a follow-up in a joined thread may continue its conversation', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
		try {
			await ctx.sendWebhook(channelMention);
			await ctx.sendWebhook(channelFollowUp);

			expect(ctx.latestContext()?.replyExpectation).toBe('optional');
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({
					modelMessage: expect.stringContaining('a conversation you joined earlier'),
				}),
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it('keeps a reply required for a mention when reading all messages', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
		try {
			await ctx.sendWebhook(channelMention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			expect(ctx.latestContext()?.replyExpectation).toBe('required');
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({ modelMessage: expect.not.stringContaining('do_not_respond') }),
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it('stays mention-only on a surface whose read-all setting is off', async () => {
		const ctx = await createTeamsReplayContext({
			settings: { teamChannels: true, readAllChannelMessages: false, groupChats: true },
		});
		try {
			await ctx.sendWebhook(channelRootPost);
			await ctx.sendWebhook(groupChatFollowUp);
			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();

			await ctx.sendWebhook(channelMention);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);

			// The mention subscribed the thread, but read-all is off.
			await ctx.sendWebhook(channelFollowUp);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
		} finally {
			await ctx.shutdown();
		}
	});

	it('does not let one surface open the other', async () => {
		const ctx = await createTeamsReplayContext({
			settings: { teamChannels: true, readAllChannelMessages: true, groupChats: true },
		});
		try {
			await ctx.sendWebhook(groupChatFollowUp);
			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();

			await ctx.sendWebhook(channelRootPost);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
		} finally {
			await ctx.shutdown();
		}
	});

	it('ignores a post from another bot and from itself', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL });
		try {
			await ctx.sendWebhook(channelBotPost);
			await ctx.sendWebhook(selfMessage);

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		} finally {
			await ctx.shutdown();
		}
	});

	const FAILED: StreamChunk[] = [
		{ type: 'error', error: { type: 'api_error', message: 'provider down' } },
		{ type: 'finish', finishReason: 'error' },
	];

	it('posts no error when a run fails on a message without a mention', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL, stream: FAILED });
		try {
			await ctx.sendWebhook(channelRootPost);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			expect(ctx.activities()).toEqual([]);
		} finally {
			await ctx.shutdown();
		}
	});

	it('still posts the error when a run fails on a mention', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL, stream: FAILED });
		try {
			await ctx.sendWebhook(channelMention);

			expect(ctx.lastPost()?.body).toMatchObject({
				type: 'message',
				conversation: { id: TEAMS_CHANNEL_CONVERSATION_ID },
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('posts nothing at all when the agent stays silent', async () => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL, stream: SILENT });
		try {
			await ctx.sendWebhook(channelRootPost);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			// No typing indicator either: every activity, typing included, is a post.
			expect(ctx.activities()).toEqual([]);
			expect(ctx.edits()).toEqual([]);
		} finally {
			await ctx.shutdown();
		}
	});
});

describe('Microsoft Teams reactions', () => {
	async function react(ctx: Awaited<ReturnType<typeof createTeamsReplayContext>>, emoji: string) {
		const registry = new ChatIntegrationRegistry();
		const teams = new TeamsIntegration(mock<Logger>(), mock<AgentRepository>());
		registry.register(teams);
		const service = mock<ChatIntegrationService>();
		service.getChatInstanceForTools.mockResolvedValue(ctx.chat);
		const executor = new ChatIntegrationActionExecutor(
			service,
			registry,
			new ChannelRateLimitGuard(),
		);
		const [descriptor] = getIntegrationToolConnectionDescriptors(
			[{ type: 'teams', credentialId: 'cred-teams' }],
			'agent-1',
		);
		return await executor.execute({
			descriptor,
			action: 'add_reaction',
			input: { emoji },
			awaitResponse: false,
			currentMessageContext: ctx.latestContext(),
		});
	}

	function reactionPath(ctx: Awaited<ReturnType<typeof createTeamsReplayContext>>) {
		const uri = ctx.reactions().at(-1)?.body.uri;
		return typeof uri === 'string' ? decodeURIComponent(uri) : undefined;
	}

	it('offers add_reaction and do_not_respond', () => {
		const teams = new TeamsIntegration(mock<Logger>(), mock<AgentRepository>());

		expect(teams.actionToolDefinitions.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['add_reaction', 'do_not_respond']),
		);
	});

	it('reacts to the current message in mention-only mode', async () => {
		const ctx = await createTeamsReplayContext();
		try {
			await ctx.sendWebhook(channelMention);

			await expect(react(ctx, 'thumbs_up')).resolves.toMatchObject({ ok: true });

			expect(reactionPath(ctx)).toMatch(
				`/v3/conversations/${TEAMS_CHANNEL_CONVERSATION_ID}/activities/${channelMention.id}/reactions/like`,
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it.each([
		['thumbs_up', 'like'],
		['eyes', '1f440_eyes'],
		['check', '2705_whiteheavycheckmark'],
		['x', '274c_crossmark'],
		['rocket', 'launch'],
		['thinking', 'think'],
		['pin', '1f4cc_pushpin'],
	])('maps %s to the Teams reaction %s when reading all messages', async (emoji, teamsType) => {
		const ctx = await createTeamsReplayContext({ settings: READ_ALL, stream: SILENT });
		try {
			await ctx.sendWebhook(channelRootPost);

			await expect(react(ctx, emoji)).resolves.toMatchObject({ ok: true });

			expect(reactionPath(ctx)).toMatch(
				new RegExp(`/activities/${channelRootPost.id}/reactions/${teamsType}$`),
			);
		} finally {
			await ctx.shutdown();
		}
	});
});
