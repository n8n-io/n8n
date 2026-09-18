import type { StreamChunk } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

import { createTeamsReplayContext } from '../../../__tests__/helpers/teams/replay-test-context';
import {
	cardAction,
	channelMention,
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
});

/** The `streaminfo` entity Teams uses to tie an activity to an open stream. */
function streamInfo(body: Record<string, unknown>): Record<string, unknown> | undefined {
	const entities = body.entities;
	if (!Array.isArray(entities)) return undefined;
	return entities.find((entity) => isRecord(entity) && entity.type === 'streaminfo') as
		| Record<string, unknown>
		| undefined;
}

const threeDeltas: StreamChunk[] = [
	{ type: 'text-delta', id: 't-1', delta: 'Looking ' },
	{ type: 'text-delta', id: 't-1', delta: 'into it ' },
	{ type: 'text-delta', id: 't-1', delta: 'now' },
	{ type: 'finish', finishReason: 'stop' },
];

describe('Microsoft Teams streaming', () => {
	it('streams a direct message reply and closes it with a final message', async () => {
		const ctx = await createTeamsReplayContext({ stream: threeDeltas });
		try {
			await ctx.sendWebhook(dmMessage);

			const activities = ctx.activities();
			const streamed = activities.filter((call) => streamInfo(call.body));
			expect(streamed.length).toBeGreaterThan(1);

			// Every activity but the last is a typing activity carrying a chunk,
			// numbered from 1 so Teams can order them.
			const chunks = streamed.slice(0, -1);
			expect(chunks.map((call) => call.body.type)).toEqual(chunks.map(() => 'typing'));
			expect(chunks.map((call) => streamInfo(call.body)?.streamSequence)).toEqual(
				chunks.map((_, index) => index + 1),
			);

			const final = streamed.at(-1)!;
			expect(final.body.type).toBe('message');
			expect(streamInfo(final.body)?.streamType).toBe('final');
			expect(final.body.text).toContain('Looking into it now');
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
			// It has to arrive before anything the stream sent, or it tells the user
			// nothing.
			expect(activities.indexOf(indicators[0])).toBe(0);
		} finally {
			await ctx.shutdown();
		}
	});

	it('sends a channel reply as one message, with no stream', async () => {
		const ctx = await createTeamsReplayContext({ stream: threeDeltas });
		try {
			await ctx.sendWebhook(channelMention);

			const activities = ctx.activities();
			expect(activities.every((call) => streamInfo(call.body) === undefined)).toBe(true);
			const messages = activities.filter((call) => call.body.type === 'message');
			expect(messages).toHaveLength(1);
			expect(messages[0].body.text).toContain('Looking into it now');
		} finally {
			await ctx.shutdown();
		}
	});

	/**
	 * A tenant that refuses streaming never acknowledges the first chunk, and the
	 * Teams SDK swallows that rejection, so the adapter would wait forever. The
	 * SDK then spends its own 30s close budget waiting for a stream id it will
	 * never get, which is what makes this turn slow rather than the fallback.
	 */
	it('falls back to an ordinary message when Teams refuses the stream, then stops streaming that connection', async () => {
		const ctx = await createTeamsReplayContext({
			stream: threeDeltas,
			failStreamingWith: { status: 403, message: 'Content stream is not allowed' },
			streamingPostTimeoutMs: 50,
		});
		try {
			await expect(ctx.sendWebhook(dmMessage)).resolves.toMatchObject({ status: 200 });

			const firstTurn = ctx.activities();
			const fallback = firstTurn.filter(
				(call) => call.body.type === 'message' && !streamInfo(call.body),
			);
			expect(fallback).toHaveLength(1);
			expect(fallback[0].body.text).toContain('Looking into it now');

			ctx.nextStream(threeDeltas);
			await ctx.sendWebhook(dmFollowUp);

			// The connection is marked buffered-only, so the second turn never
			// opens a stream and never pays the wait again.
			const secondTurn = ctx.activities().slice(firstTurn.length);
			expect(secondTurn.every((call) => streamInfo(call.body) === undefined)).toBe(true);
			const messages = secondTurn.filter((call) => call.body.type === 'message');
			expect(messages).toHaveLength(1);
			expect(messages[0].body.text).toContain('Looking into it now');
		} finally {
			await ctx.shutdown();
		}
	}, 60_000);

	it('still delivers the whole reply when the stream outlives the Teams time limit', async () => {
		const ctx = await createTeamsReplayContext({
			stream: threeDeltas,
			failStreamingWith: {
				status: 403,
				message: 'Content stream finished due to exceeded streaming time.',
				// The stream starts normally and only then trips the limit, which is
				// what happens to a run that takes longer than two minutes.
				afterChunks: 1,
			},
		});
		try {
			await ctx.sendWebhook(dmMessage);

			// The SDK recovers by updating the message it already created.
			expect(ctx.lastEdit()?.body).toMatchObject({ text: 'Looking into it now' });
		} finally {
			await ctx.shutdown();
		}
	});

	it('streams once and posts text after a card as its own message', async () => {
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

			const activities = ctx.activities();
			// One streamed run: every streaming activity shares a single stream.
			const streamIds = new Set(
				activities
					.map((call) => streamInfo(call.body)?.streamId)
					.filter((id): id is string => typeof id === 'string'),
			);
			expect(streamIds.size).toBe(1);

			// The trailing text is its own plain message rather than more stream
			// content refilling the bubble that sits above the card.
			const trailing = activities.filter(
				(call) =>
					call.body.type === 'message' &&
					!streamInfo(call.body) &&
					typeof call.body.text === 'string' &&
					call.body.text.includes('Waiting on you.'),
			);
			expect(trailing).toHaveLength(1);
		} finally {
			await ctx.shutdown();
		}
	});
});
