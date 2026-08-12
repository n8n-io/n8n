import type { OutboundHttp } from '@n8n/backend-network';
import { createFakeOutboundHttp, type Route } from '@n8n/backend-network/testing';

import {
	NativeStreamTransport,
	SlackWebClient,
	truncateChunk,
	UpdateStreamTransport,
	type SlackChunk,
	type StreamTarget,
} from '../slack-web-client';

const textBudget = (chunk: SlackChunk): number =>
	chunk.type === 'task_update'
		? chunk.title.length + (chunk.details?.length ?? 0) + (chunk.output?.length ?? 0)
		: chunk.type === 'plan_update'
			? chunk.title.length
			: chunk.type === 'blocks'
				? 0
				: chunk.text.length;

describe('truncateChunk', () => {
	it('caps the combined task text at 256 characters, keeping the title intact', () => {
		const chunk: SlackChunk = {
			type: 'task_update',
			id: 't1',
			title: 'Create the form',
			status: 'in_progress',
			details: 'y'.repeat(400),
		};
		const out = truncateChunk(chunk);
		expect(textBudget(out)).toBeLessThanOrEqual(256);
		expect(out.type === 'task_update' && out.title).toBe('Create the form');
	});

	it('truncates an oversized title alone to 256', () => {
		const out = truncateChunk({
			type: 'task_update',
			id: 't1',
			title: 'x'.repeat(400),
			status: 'in_progress',
		});
		expect(textBudget(out)).toBeLessThanOrEqual(256);
	});

	it('drops output before details before title when over budget', () => {
		const out = truncateChunk({
			type: 'task_update',
			id: 't1',
			title: 't'.repeat(200),
			status: 'complete',
			details: 'd'.repeat(200),
			output: 'o'.repeat(200),
		});
		expect(out.type === 'task_update' && out.title.length).toBe(200);
		expect(textBudget(out)).toBeLessThanOrEqual(256);
	});

	it('caps a plan title at 256', () => {
		const out = truncateChunk({ type: 'plan_update', title: 'p'.repeat(400) });
		expect(textBudget(out)).toBeLessThanOrEqual(256);
	});

	it('caps markdown at 12000 characters', () => {
		const out = truncateChunk({ type: 'markdown_text', text: 'z'.repeat(20000) });
		expect(out.type === 'markdown_text' && out.text.length).toBe(12000);
	});

	it('leaves a short chunk untouched', () => {
		const chunk: SlackChunk = { type: 'plan_update', title: 'Short' };
		expect(truncateChunk(chunk)).toEqual(chunk);
	});

	it('caps a blocks chunk at 50 blocks', () => {
		const blocks = Array.from({ length: 75 }, (_, i) => ({ type: 'section', text: `${i}` }));
		const out = truncateChunk({ type: 'blocks', blocks });
		expect(out.type === 'blocks' && out.blocks.length).toBe(50);
	});

	it('leaves a blocks chunk with 50 or fewer blocks untouched', () => {
		const chunk: SlackChunk = { type: 'blocks', blocks: [{ type: 'section' }] };
		expect(truncateChunk(chunk)).toEqual(chunk);
	});
});

function chunksFromBody(body: unknown): Array<Record<string, unknown>> {
	if (typeof body !== 'object' || body === null || !('chunks' in body)) return [];
	const { chunks } = body;
	if (!Array.isArray(chunks)) return [];
	return chunks.filter(
		(chunk): chunk is Record<string, unknown> => typeof chunk === 'object' && chunk !== null,
	);
}

function createClient(routes: Route[]) {
	const { outboundHttp, httpRequest } = createFakeOutboundHttp(
		routes,
		vi.fn as unknown as Parameters<typeof createFakeOutboundHttp>[1],
	);
	const client = new SlackWebClient(outboundHttp as unknown as OutboundHttp);
	return { client, httpRequest };
}

const TOKEN = 'xoxb-test-token';

describe('SlackWebClient', () => {
	describe('getBotUserId', () => {
		it('resolves the bot user id from auth.test', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/auth.test', body: { ok: true, user_id: 'U_BOT' } },
			]);

			await expect(client.getBotUserId(TOKEN)).resolves.toBe('U_BOT');
		});

		it('throws without leaking the token when auth.test fails', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/auth.test',
					body: { ok: false, error: 'invalid_auth' },
				},
			]);

			await expect(client.getBotUserId(TOKEN)).rejects.toThrow(/invalid_auth/);

			const error: unknown = await client.getBotUserId(TOKEN).catch((caught: unknown) => caught);
			expect(error).toBeInstanceOf(Error);
			expect(error instanceof Error ? error.message : '').not.toContain(TOKEN);
		});
	});

	describe('getUserInfo', () => {
		it('reads the email and timezone off the user', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/users.info',
					body: { ok: true, user: { tz: 'Europe/Lisbon', profile: { email: 'ada@example.com' } } },
				},
			]);

			await expect(client.getUserInfo(TOKEN, 'U1')).resolves.toEqual({
				email: 'ada@example.com',
				tz: 'Europe/Lisbon',
			});
		});

		it('returns null email and null tz when the user has neither', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/users.info', body: { ok: true, user: { profile: {} } } },
			]);

			await expect(client.getUserInfo(TOKEN, 'U1')).resolves.toEqual({ email: null, tz: null });
		});

		it('returns null email and null tz when there is no user at all', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/users.info', body: { ok: true } },
			]);

			await expect(client.getUserInfo(TOKEN, 'U1')).resolves.toEqual({ email: null, tz: null });
		});
	});

	describe('getUserEmail', () => {
		it('reads the email off the user profile', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/users.info',
					body: { ok: true, user: { profile: { email: 'ada@example.com' } } },
				},
			]);

			await expect(client.getUserEmail(TOKEN, 'U1')).resolves.toBe('ada@example.com');
		});

		it('returns null when the profile has no email', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/users.info', body: { ok: true, user: { profile: {} } } },
			]);

			await expect(client.getUserEmail(TOKEN, 'U1')).resolves.toBeNull();
		});
	});

	describe('lookupUserByEmail', () => {
		it('resolves the Slack user id for a known email', async () => {
			const { client, httpRequest } = createClient([
				{
					method: 'POST',
					pathname: '/api/users.lookupByEmail',
					body: { ok: true, user: { id: 'U9' } },
				},
			]);

			await expect(client.lookupUserByEmail(TOKEN, 'ada@example.com')).resolves.toBe('U9');
			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({ email: 'ada@example.com' });
		});

		it('returns null when no Slack account matches the email', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/users.lookupByEmail',
					body: { ok: false, error: 'users_not_found' },
				},
			]);

			await expect(client.lookupUserByEmail(TOKEN, 'nobody@example.com')).resolves.toBeNull();
		});

		it('throws on an unrelated Slack error', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/users.lookupByEmail',
					body: { ok: false, error: 'invalid_auth' },
				},
			]);

			await expect(client.lookupUserByEmail(TOKEN, 'ada@example.com')).rejects.toThrow(
				/invalid_auth/,
			);
		});
	});

	describe('openDm', () => {
		it('opens a DM and returns the channel id', async () => {
			const { client, httpRequest } = createClient([
				{
					method: 'POST',
					pathname: '/api/conversations.open',
					body: { ok: true, channel: { id: 'D1' } },
				},
			]);

			await expect(client.openDm(TOKEN, 'U9')).resolves.toBe('D1');
			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({ users: 'U9' });
		});

		it('throws when Slack cannot open the DM', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/conversations.open',
					body: { ok: false, error: 'cannot_dm_bot' },
				},
			]);

			await expect(client.openDm(TOKEN, 'U9')).rejects.toThrow(/cannot_dm_bot/);
		});

		it('throws when Slack omits the channel id', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/conversations.open', body: { ok: true, channel: {} } },
			]);

			await expect(client.openDm(TOKEN, 'U9')).rejects.toThrow(/channel id/);
		});
	});

	describe('postMessage', () => {
		it('sends channel, text and thread_ts and returns the message ts', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/chat.postMessage', body: { ok: true, ts: '100.1' } },
			]);

			const result = await client.postMessage(TOKEN, {
				channel: 'C1',
				text: 'hello',
				threadTs: '99.1',
			});

			expect(result).toEqual({ ts: '100.1' });
			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({ channel: 'C1', text: 'hello', thread_ts: '99.1' });
			expect(options.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
		});
	});

	describe('postEphemeral', () => {
		it('sends the target user alongside the message', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/chat.postEphemeral', body: { ok: true } },
			]);

			await client.postEphemeral(TOKEN, { channel: 'C1', user: 'U1', text: 'psst' });

			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({ channel: 'C1', user: 'U1', text: 'psst' });
		});
	});

	describe('updateMessage', () => {
		it('rewrites an existing message', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/chat.update', body: { ok: true } },
			]);

			await client.updateMessage(TOKEN, { channel: 'C1', ts: '100.1', text: 'updated' });

			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({ channel: 'C1', ts: '100.1', text: 'updated' });
		});
	});

	describe('fetchThreadHistory', () => {
		it('maps replies into thread messages', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/conversations.replies',
					body: {
						ok: true,
						messages: [
							{ ts: '1.1', text: 'hi', user: 'U1' },
							{ ts: '2.2', text: 'yo', bot_id: 'B1' },
						],
					},
				},
			]);

			const result = await client.fetchThreadHistory(TOKEN, { channel: 'C1', threadTs: '1.1' });

			expect(result).toEqual([
				{ ts: '1.1', text: 'hi', userId: 'U1', botId: undefined },
				{ ts: '2.2', text: 'yo', userId: undefined, botId: 'B1' },
			]);
		});

		it('returns an empty array when there are no messages', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/conversations.replies', body: { ok: true } },
			]);

			await expect(
				client.fetchThreadHistory(TOKEN, { channel: 'C1', threadTs: '1.1' }),
			).resolves.toEqual([]);
		});
	});

	describe('setStatus', () => {
		it('sends the assistant thread status', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/assistant.threads.setStatus', body: { ok: true } },
			]);

			await client.setStatus(TOKEN, {
				channelId: 'C1',
				threadTs: '1.1',
				status: 'is thinking...',
			});

			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({
				channel_id: 'C1',
				thread_ts: '1.1',
				status: 'is thinking...',
			});
		});
	});

	describe('openStream', () => {
		const target: StreamTarget = { channel: 'C1', threadTs: '1.1' };

		it('opens a native transport when the stream starts successfully', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/chat.startStream', body: { ok: true, ts: '10.1' } },
			]);

			const transport = await client.openStream(TOKEN, target, 'native');

			expect(transport).toBeInstanceOf(NativeStreamTransport);
		});

		it('falls back to the update transport when the scope is missing', async () => {
			const { client, httpRequest } = createClient([
				{
					method: 'POST',
					pathname: '/api/chat.startStream',
					body: { ok: false, error: 'missing_scope' },
				},
				{ method: 'POST', pathname: '/api/chat.postMessage', body: { ok: true, ts: '20.1' } },
			]);

			const transport = await client.openStream(TOKEN, target, 'native');

			expect(transport).toBeInstanceOf(UpdateStreamTransport);
			expect(
				httpRequest.mock.calls.some(([options]) => options.url.endsWith('/chat.postMessage')),
			).toBe(true);
		});

		it('falls back when the channel type is not supported', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/chat.startStream',
					body: { ok: false, error: 'channel_type_not_supported' },
				},
				{ method: 'POST', pathname: '/api/chat.postMessage', body: { ok: true, ts: '20.1' } },
			]);

			const transport = await client.openStream(TOKEN, target, 'native');

			expect(transport).toBeInstanceOf(UpdateStreamTransport);
		});

		it('does not fall back for an unrelated Slack error', async () => {
			const { client } = createClient([
				{
					method: 'POST',
					pathname: '/api/chat.startStream',
					body: { ok: false, error: 'not_in_channel' },
				},
			]);

			await expect(client.openStream(TOKEN, target, 'native')).rejects.toThrow(/not_in_channel/);
		});

		it('goes straight to the update transport in fallback mode', async () => {
			const { client } = createClient([
				{ method: 'POST', pathname: '/api/chat.postMessage', body: { ok: true, ts: '20.1' } },
			]);

			const transport = await client.openStream(TOKEN, target, 'fallback');

			expect(transport).toBeInstanceOf(UpdateStreamTransport);
		});

		it('sends channel, thread_ts and task_display_mode on chat.startStream, omitting recipient ids when the target has neither', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/chat.startStream', body: { ok: true, ts: '10.1' } },
			]);

			await client.openStream(TOKEN, target, 'native');

			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({
				channel: 'C1',
				thread_ts: '1.1',
				task_display_mode: 'plan',
			});
			expect(options.body).not.toHaveProperty('recipient_user_id');
			expect(options.body).not.toHaveProperty('recipient_team_id');
		});

		it('includes both recipient ids on chat.startStream when the target carries both', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/chat.startStream', body: { ok: true, ts: '10.1' } },
			]);
			const channelTarget: StreamTarget = {
				channel: 'C1',
				threadTs: '1.1',
				recipientUserId: 'U1',
				recipientTeamId: 'T1',
			};

			await client.openStream(TOKEN, channelTarget, 'native');

			const [options] = httpRequest.mock.calls[0];
			expect(options.body).toMatchObject({ recipient_user_id: 'U1', recipient_team_id: 'T1' });
		});

		it('truncates an oversized task_update chunk before chat.appendStream', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/chat.startStream', body: { ok: true, ts: '10.1' } },
				{ method: 'POST', pathname: '/api/chat.appendStream', body: { ok: true } },
			]);

			const transport = await client.openStream(TOKEN, target, 'native');
			await transport.append([
				{ type: 'task_update', id: 't1', title: 'x'.repeat(400), status: 'in_progress' },
			]);

			const appendCall = httpRequest.mock.calls.find(([options]) =>
				options.url.endsWith('/chat.appendStream'),
			);
			expect(appendCall).toBeDefined();
			const [options] = appendCall ?? [];
			const chunks = chunksFromBody(options?.body);
			expect(chunks).toHaveLength(1);
			const title = chunks[0]?.title;
			expect(typeof title).toBe('string');
			expect(typeof title === 'string' ? title.length : Infinity).toBeLessThanOrEqual(256);
		});

		it('carries the close(final) markdown and blocks on chat.stopStream', async () => {
			const { client, httpRequest } = createClient([
				{ method: 'POST', pathname: '/api/chat.startStream', body: { ok: true, ts: '10.1' } },
				{ method: 'POST', pathname: '/api/chat.stopStream', body: { ok: true } },
			]);

			const transport = await client.openStream(TOKEN, target, 'native');
			await transport.close({ markdown: 'Done', blocks: [{ type: 'section' }] });

			const stopCall = httpRequest.mock.calls.find(([options]) =>
				options.url.endsWith('/chat.stopStream'),
			);
			expect(stopCall).toBeDefined();
			const [options] = stopCall ?? [];
			expect(options?.body).toMatchObject({
				channel: 'C1',
				ts: '10.1',
				markdown_text: 'Done',
				blocks: [{ type: 'section' }],
			});
		});
	});
});

describe('NativeStreamTransport', () => {
	function createApi() {
		return {
			startStream: vi.fn().mockResolvedValue('10.1'),
			appendStream: vi.fn().mockResolvedValue(undefined),
			stopStream: vi.fn().mockResolvedValue(undefined),
		};
	}

	it('rejects a target without a thread_ts, without calling the API', async () => {
		const api = createApi();
		const transport = new NativeStreamTransport(api);

		await expect(transport.open({ channel: 'C1', threadTs: '' })).rejects.toThrow();
		expect(api.startStream).not.toHaveBeenCalled();
	});

	it('rejects a channel target missing one of the recipient ids', async () => {
		const api = createApi();
		const transport = new NativeStreamTransport(api);

		await expect(
			transport.open({ channel: 'C1', threadTs: '1.1', recipientUserId: 'U1' }),
		).rejects.toThrow(/recipient_team_id/);
		expect(api.startStream).not.toHaveBeenCalled();
	});

	it('opens once and forwards append/close to the API', async () => {
		const api = createApi();
		const transport = new NativeStreamTransport(api);
		const target: StreamTarget = { channel: 'C1', threadTs: '1.1' };

		await transport.open(target);
		await expect(transport.open(target)).rejects.toThrow();

		const chunks: SlackChunk[] = [{ type: 'plan_update', title: 'Plan' }];
		await transport.append(chunks);
		expect(api.appendStream).toHaveBeenCalledWith('C1', '10.1', chunks);

		await transport.close({ markdown: 'done' });
		expect(api.stopStream).toHaveBeenCalledWith('C1', '10.1', { markdown: 'done' });
	});
});

describe('UpdateStreamTransport', () => {
	function createApi() {
		return {
			postMessage: vi.fn().mockResolvedValue({ ts: '10.1' }),
			updateMessage: vi.fn().mockResolvedValue(undefined),
		};
	}

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('posts a placeholder message on open', async () => {
		const api = createApi();
		const transport = new UpdateStreamTransport(api);

		await transport.open({ channel: 'C1', threadTs: '1.1' });

		expect(api.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ channel: 'C1', threadTs: '1.1' }),
		);
	});

	it('renders the checklist with status glyphs on the first append', async () => {
		const api = createApi();
		const transport = new UpdateStreamTransport(api);
		await transport.open({ channel: 'C1', threadTs: '1.1' });

		await transport.append([
			{ type: 'plan_update', title: 'The plan' },
			{ type: 'task_update', id: 't1', title: 'Step one', status: 'in_progress' },
		]);

		expect(api.updateMessage).toHaveBeenCalledTimes(1);
		const [call] = api.updateMessage.mock.calls;
		const [args] = call;
		expect(args.channel).toBe('C1');
		expect(args.ts).toBe('10.1');
		expect(args.text).toContain('The plan');
		expect(args.text).toContain('🔄');
		expect(args.text).toContain('Step one');
	});

	it('throttles rewrites to at least 1.5s apart, then catches up', async () => {
		const api = createApi();
		const transport = new UpdateStreamTransport(api);
		await transport.open({ channel: 'C1', threadTs: '1.1' });

		await transport.append([
			{ type: 'task_update', id: 't1', title: 'Step one', status: 'in_progress' },
		]);
		expect(api.updateMessage).toHaveBeenCalledTimes(1);

		await transport.append([
			{ type: 'task_update', id: 't1', title: 'Step one', status: 'complete' },
		]);
		expect(api.updateMessage).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1500);
		expect(api.updateMessage).toHaveBeenCalledTimes(2);
		const [, secondCall] = api.updateMessage.mock.calls;
		expect(secondCall[0].text).toContain('✅');
	});

	it('flushes exactly once on close even with a pending throttled rewrite', async () => {
		const api = createApi();
		const transport = new UpdateStreamTransport(api);
		await transport.open({ channel: 'C1', threadTs: '1.1' });

		await transport.append([
			{ type: 'task_update', id: 't1', title: 'Step one', status: 'in_progress' },
		]);
		await transport.append([
			{ type: 'task_update', id: 't1', title: 'Step one', status: 'complete' },
		]);
		expect(api.updateMessage).toHaveBeenCalledTimes(1);

		await transport.close({ markdown: 'Wrapping up', blocks: [{ type: 'section' }] });
		expect(api.updateMessage).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(5000);
		expect(api.updateMessage).toHaveBeenCalledTimes(2);

		const [, closeCall] = api.updateMessage.mock.calls;
		expect(closeCall[0].text).toContain('Wrapping up');
		expect(closeCall[0].blocks).toEqual([{ type: 'section' }]);
	});
});
