import type { HttpRequestClient } from '@n8n/backend-network';

import {
	downloadDiscordAttachment,
	fetchDiscordApplicationMetadata,
	searchDiscordChannels,
	settleDiscordActionMessage,
} from '../platforms/discord-operations';

const API_URL = 'https://discord.com/api/v10';
const BOT_TOKEN = 'test-bot-token';

const GUILD_A = { id: '800000000000000001', name: 'n8n Test Server' };
const GUILD_B = { id: '800000000000000002', name: 'Second Server' };

type ChannelFixture = { id: string; name: string; type: number };

function createHttpClientStub(
	onRequest: (request: {
		method: string;
		url: URL;
		body: Record<string, unknown>;
	}) => {
		apiCall: { method: string; body: Record<string, unknown> };
		responseBody: unknown;
		status?: number;
	},
) {
	const apiCalls: Array<{ method: string; body: Record<string, unknown> }> = [];
	const httpClient = {
		request: vi.fn(
			async (request: {
				method?: string;
				url: string;
				body?: Record<string, unknown>;
			}) => {
				const result = onRequest({
					method: request.method ?? 'GET',
					url: new URL(request.url),
					body: request.body ?? {},
				});
				apiCalls.push(result.apiCall);
				return {
					body: result.responseBody,
					headers: {},
					statusCode: result.status ?? 200,
				};
			},
		),
	} as unknown as HttpRequestClient;
	return { httpClient, apiCalls };
}

/**
 * Answer the two endpoints the search walks: the bot's servers, then each
 * server's channels. `forbiddenGuilds` simulates a server the bot cannot list.
 */
function installDiscordStub(options: {
	guilds: Array<{ id: string; name: string }>;
	channelsByGuild: Record<string, ChannelFixture[]>;
	forbiddenGuilds?: string[];
}) {
	return createHttpClientStub(({ url }) => {
		const path = url.pathname.replace(/^\/api\/v\d+/, '');
		const apiCall = { method: `GET ${path}`, body: {} };

		if (path === '/users/@me/guilds') {
			const after = url.searchParams.get('after');
			const start = after ? options.guilds.findIndex((guild) => guild.id === after) + 1 : 0;
			const limit = Number(url.searchParams.get('limit'));
			return { apiCall, responseBody: options.guilds.slice(start, start + limit) };
		}

		const guildId = /^\/guilds\/(\d+)\/channels$/.exec(path)?.[1];
		if (guildId) {
			if (options.forbiddenGuilds?.includes(guildId)) {
				return { apiCall, responseBody: { message: 'Missing Access' }, status: 403 };
			}
			return { apiCall, responseBody: options.channelsByGuild[guildId] ?? [] };
		}

		return { apiCall, responseBody: {} };
	});
}

async function search(httpClient: HttpRequestClient, query: string, limit = 10, cursor?: string) {
	return (await searchDiscordChannels({
		httpClient,
		apiUrl: API_URL,
		botToken: BOT_TOKEN,
		input: { query, limit, cursor },
	})) as {
		ok: boolean;
		channels: Array<Record<string, string>>;
		resultCount: number;
		nextCursor?: string;
	};
}

describe('searchDiscordChannels', () => {
	it('resolves a channel name to the ID shape send_channel_message expects', async () => {
		const stub = installDiscordStub({
			guilds: [GUILD_A],
			channelsByGuild: {
				[GUILD_A.id]: [{ id: '700000000000000001', name: 'general', type: 0 }],
			},
		});

		// A leading '#' and different casing are how people actually write it.
		const result = await search(stub.httpClient, '#General');

		expect(result).toMatchObject({ ok: true, resultCount: 1 });
		expect(result.channels[0]).toEqual({
			channelId: `discord:${GUILD_A.id}:700000000000000001`,
			name: 'general',
			guildId: GUILD_A.id,
			guildName: 'n8n Test Server',
		});
		expect(result.nextCursor).toBeUndefined();
	});

	it('ignores channels the agent cannot post a message into', async () => {
		const stub = installDiscordStub({
			guilds: [GUILD_A],
			channelsByGuild: {
				[GUILD_A.id]: [
					{ id: '1', name: 'team-voice', type: 2 },
					{ id: '2', name: 'team-forum', type: 15 },
					{ id: '3', name: 'team-updates', type: 5 },
				],
			},
		});

		const result = await search(stub.httpClient, 'team');

		expect(result.channels.map((channel) => channel.name)).toEqual(['team-updates']);
	});

	it('keeps searching other servers when one refuses to list its channels', async () => {
		const stub = installDiscordStub({
			guilds: [GUILD_A, GUILD_B],
			channelsByGuild: {
				[GUILD_B.id]: [{ id: '9', name: 'general', type: 0 }],
			},
			forbiddenGuilds: [GUILD_A.id],
		});

		const result = await search(stub.httpClient, 'general');

		expect(result.channels).toEqual([
			{
				channelId: `discord:${GUILD_B.id}:9`,
				name: 'general',
				guildId: GUILD_B.id,
				guildName: 'Second Server',
			},
		]);
	});

	it('stops at the requested limit', async () => {
		const stub = installDiscordStub({
			guilds: [GUILD_A],
			channelsByGuild: {
				[GUILD_A.id]: [
					{ id: '1', name: 'log-one', type: 0 },
					{ id: '2', name: 'log-two', type: 0 },
					{ id: '3', name: 'log-three', type: 0 },
				],
			},
		});

		const result = await search(stub.httpClient, 'log', 2);

		expect(result.resultCount).toBe(2);
	});

	it('continues searching guilds from the returned cursor', async () => {
		const guilds = Array.from({ length: 21 }, (_, index) => ({
			id: String(800000000000000001n + BigInt(index)),
			name: `Server ${index + 1}`,
		}));
		const lastGuild = guilds.at(-1)!;
		const stub = installDiscordStub({
			guilds,
			channelsByGuild: {
				[lastGuild.id]: [{ id: '700000000000000021', name: 'general', type: 0 }],
			},
		});

		const firstPage = await search(stub.httpClient, 'general');
		const secondPage = await search(stub.httpClient, 'general', 10, firstPage.nextCursor);

		expect(firstPage).toMatchObject({ channels: [], nextCursor: guilds[19].id });
		expect(secondPage.channels).toEqual([
			{
				channelId: `discord:${lastGuild.id}:700000000000000021`,
				name: 'general',
				guildId: lastGuild.id,
				guildName: lastGuild.name,
			},
		]);
		expect(secondPage.nextCursor).toBeUndefined();
	});
});

it('settles an action by replacing the message and removing its controls', async () => {
	const stub = createHttpClientStub(({ method, url, body }) => ({
		apiCall: {
			method: `${method} ${url.pathname.replace(/^\/api\/v\d+/, '')}`,
			body,
		},
		responseBody: {},
	}));

	await settleDiscordActionMessage({
		httpClient: stub.httpClient,
		apiUrl: API_URL,
		botToken: BOT_TOKEN,
		threadId: 'discord:800000000000000001:700000000000000001:600000000000000001',
		messageId: '1000',
		content: '✅ Approved by Alice',
	});

	expect(stub.apiCalls).toEqual([
		{
			method: 'PATCH /channels/600000000000000001/messages/1000',
			body: {
				content: '✅ Approved by Alice',
				embeds: [],
				components: [],
				allowed_mentions: { parse: [] },
			},
		},
	]);
});

it('cancels an in-flight attachment download when the deadline expires', async () => {
	const controller = new AbortController();
	const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
	const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);

	try {
		const httpClient = {
			request: vi.fn(
				async (options: { abortSignal?: AbortSignal }) =>
					await new Promise((resolve, reject) => {
						const { abortSignal } = options;
						if (!abortSignal) {
							resolve({ body: Buffer.alloc(0), headers: {}, statusCode: 200 });
							return;
						}
						if (abortSignal.aborted) {
							reject(abortSignal.reason);
							return;
						}
						abortSignal.addEventListener(
							'abort',
							() => {
								reject(abortSignal.reason);
							},
							{ once: true },
						);
					}),
			),
		} as unknown as HttpRequestClient;

		const downloadPromise = downloadDiscordAttachment(
			'https://cdn.discordapp.com/attachments/1/2/file.bin',
			httpClient,
		);
		controller.abort(timeoutError);

		await expect(downloadPromise).rejects.toBe(timeoutError);
	} finally {
		timeoutSpy.mockRestore();
	}
});

it('does not send credentials on cross-origin redirects for authenticated Discord requests', async () => {
	const stub = createHttpClientStub(({ method, url, body }) => {
		const path = url.pathname.replace(/^\/api\/v\d+/, '');
		const apiCall = { method: `${method} ${path}`, body };

		if (path === '/users/@me/guilds') {
			return { apiCall, responseBody: [GUILD_A] };
		}
		if (path === `/guilds/${GUILD_A.id}/channels`) {
			return {
				apiCall,
				responseBody: [{ id: '700000000000000001', name: 'general', type: 0 }],
			};
		}
		if (path === '/oauth2/applications/@me') {
			return {
				apiCall,
				responseBody: { id: 'app-1', verify_key: 'verify-key-1' },
			};
		}
		return { apiCall, responseBody: {} };
	});

	await search(stub.httpClient, 'general');
	await settleDiscordActionMessage({
		httpClient: stub.httpClient,
		apiUrl: API_URL,
		botToken: BOT_TOKEN,
		threadId: `discord:${GUILD_A.id}:700000000000000001`,
		messageId: '1000',
		content: 'settled',
	});
	await fetchDiscordApplicationMetadata({
		httpClient: stub.httpClient,
		apiUrl: API_URL,
		botToken: BOT_TOKEN,
	});

	const requestOptions = vi.mocked(stub.httpClient.request).mock.calls.map(([options]) => options);
	expect(requestOptions.length).toBeGreaterThanOrEqual(3);
	expect(
		requestOptions.every(
			(options) =>
				(options as { sendCredentialsOnCrossOriginRedirect?: boolean })
					.sendCredentialsOnCrossOriginRedirect === false,
		),
	).toBe(true);
});
