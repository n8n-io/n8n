import { readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

import {
	createDiscordReplayContext,
	DISCORD_APPLICATION_ID,
	DISCORD_CHANNEL_ID,
	DISCORD_GUILD_ID,
	DISCORD_THREAD_ID,
	type DiscordApiCall,
	type DiscordMessageFixture,
	type DiscordReplayFixtures,
} from '../../../__tests__/helpers/discord/replay-test-context';

// The chat SDK + adapters are ESM-only. Production loads them via esm-loader's
// `new Function()` hack to dodge the CJS transform, which can't run under vitest;
// redirect the loaders to native dynamic imports so the real adapters are used.
vi.mock('../../../esm-loader', () => ({
	loadChatSdk: async () => await import('chat'),
	loadMemoryState: async () => await import('@chat-adapter/state-memory'),
	loadTelegramAdapter: async () => await import('@chat-adapter/telegram'),
	loadSlackAdapter: async () => await import('@chat-adapter/slack'),
	loadLinearAdapter: async () => await import('@chat-adapter/linear'),
	loadDiscordAdapter: async () => await import('@chat-adapter/discord'),
}));

const fixtures = jsonParse<DiscordReplayFixtures>(
	readFileSync(join(__dirname, '../../../__tests__/fixtures/discord/basic.json'), 'utf8'),
);

const THREAD_CREATE_CALL = `POST /channels/${DISCORD_CHANNEL_ID}/messages/${fixtures.mention.id}/threads`;
const POST_TO_THREAD = `POST /channels/${DISCORD_THREAD_ID}/messages`;
const POST_TO_CHANNEL = `POST /channels/${DISCORD_CHANNEL_ID}/messages`;

function withFixture(overrides: Partial<DiscordMessageFixture>): DiscordMessageFixture {
	return { ...fixtures.mention, ...overrides };
}

function methodsOf(apiCalls: DiscordApiCall[]): string[] {
	return apiCalls.map((call) => call.method);
}

/** Buttons the adapter rendered on the last posted message. */
function customIdsOnLastPost(body: Record<string, unknown>): string[] {
	const rows = (body.components ?? []) as Array<{
		components?: Array<{ custom_id?: string }>;
	}>;
	return rows.flatMap((row) => (row.components ?? []).map((c) => c.custom_id ?? ''));
}

describe('Discord Gateway integration scenarios', () => {
	it('opens a thread for a channel mention and answers inside it', async () => {
		const ctx = await createDiscordReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(methodsOf(ctx.apiCalls)).toContain(THREAD_CREATE_CALL);
			expect(ctx.lastApiCall(POST_TO_THREAD)?.body).toMatchObject({ content: 'Got it' });
			expect(ctx.latestContext()).toMatchObject({
				target: {
					threadId: `discord:${DISCORD_GUILD_ID}:${DISCORD_CHANNEL_ID}:${DISCORD_THREAD_ID}`,
					channelId: `discord:${DISCORD_GUILD_ID}:${DISCORD_CHANNEL_ID}`,
				},
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('answers a mention inside an existing thread without opening another one', async () => {
		const ctx = await createDiscordReplayContext(fixtures);
		try {
			await ctx.sendWebhook(
				withFixture({
					id: '500000000000000021',
					channel_id: DISCORD_THREAD_ID,
					content: `<@${DISCORD_APPLICATION_ID}> still here?`,
					thread: { id: DISCORD_THREAD_ID, parent_id: DISCORD_CHANNEL_ID },
				}),
			);

			expect(methodsOf(ctx.apiCalls).filter((m) => m.endsWith('/threads'))).toEqual([]);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'still here?' }),
			);
			expect(ctx.lastApiCall(POST_TO_THREAD)?.body).toMatchObject({ content: 'Got it' });
		} finally {
			await ctx.shutdown();
		}
	});

	it('sends a channel message to the parent channel rather than the mention thread', async () => {
		const ctx = await createDiscordReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);
			const context = ctx.latestContext();

			const result = await ctx.actionExecutor.execute({
				descriptor: ctx.descriptor,
				action: 'send_channel_message',
				input: {
					channelId: context?.target.channelId,
					message: { text: 'Announcement for everyone' },
				},
				awaitResponse: false,
				currentMessageContext: context,
			});

			expect(result).toMatchObject({ ok: true });
			expect(ctx.lastApiCall(POST_TO_CHANNEL)?.body).toMatchObject({
				content: 'Announcement for everyone',
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('resumes a suspended approval from a button click and settles the card in place', async () => {
		const ctx = await createDiscordReplayContext(fixtures, {
			stream: [
				{
					type: 'tool-call-suspended',
					runId: 'run-discord-1',
					toolCallId: 'tool-discord-1',
					toolName: 'approval',
					suspendPayload: {
						type: 'approval',
						toolName: 'send_discord_message',
						displayName: 'Send Discord message',
						args: { text: 'Continue?' },
					},
					// Declaring `approved` is what makes the button resolve to
					// `{ approved: true }`, which is the shape the resume handler needs
					// before it will settle the card instead of leaving it as-is.
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
					},
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});
		try {
			await ctx.sendWebhook(fixtures.mention);
			const approvalPost = ctx.lastApiCall(POST_TO_THREAD);
			const [customId] = customIdsOnLastPost(approvalPost?.body ?? {});
			if (!customId) throw new Error('Expected the approval card to render buttons');

			ctx.nextStream([
				{ type: 'text-delta', id: 'resume-text', delta: 'Approved, carrying on' },
				{ type: 'finish', finishReason: 'stop' },
			]);
			await ctx.sendInteraction({
				id: 'interaction-1',
				application_id: DISCORD_APPLICATION_ID,
				type: 3,
				token: 'interaction-token',
				version: 1,
				guild_id: DISCORD_GUILD_ID,
				channel_id: DISCORD_THREAD_ID,
				channel: { id: DISCORD_THREAD_ID, type: 11, parent_id: DISCORD_CHANNEL_ID },
				member: {
					user: { id: fixtures.user.id, username: fixtures.user.username },
				},
				message: { id: '1000', content: 'Continue?' },
				data: { custom_id: customId, component_type: 2 },
			});

			expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					runId: 'run-discord-1',
					toolCallId: 'tool-discord-1',
					resumeData: { approved: true },
					integrationType: 'discord',
				}),
			);
			// `deleteActionMessageBeforeResume` is false for Discord because the
			// interaction is acknowledged with DeferredUpdateMessage, which promises
			// Discord an edit of the source message rather than its removal.
			expect(methodsOf(ctx.apiCalls)).toContain(
				`PATCH /channels/${DISCORD_THREAD_ID}/messages/1000`,
			);
			expect(methodsOf(ctx.apiCalls)).not.toContain(
				`DELETE /channels/${DISCORD_THREAD_ID}/messages/1000`,
			);
		} finally {
			await ctx.shutdown();
		}
	});
});
