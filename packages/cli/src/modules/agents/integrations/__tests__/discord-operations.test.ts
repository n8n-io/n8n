import { searchDiscordChannels } from '../platforms/discord-operations';
import { installFetchStub } from './helpers/replay-test-helpers';

const API_URL = 'https://discord.com/api/v10';
const BOT_TOKEN = 'test-bot-token';

const GUILD_A = { id: '800000000000000001', name: 'n8n Test Server' };
const GUILD_B = { id: '800000000000000002', name: 'Second Server' };

type ChannelFixture = { id: string; name: string; type: number };

/**
 * Answer the two endpoints the search walks: the bot's servers, then each
 * server's channels. `forbiddenGuilds` simulates a server the bot cannot list.
 */
function installDiscordStub(options: {
	guilds: Array<{ id: string; name: string }>;
	channelsByGuild: Record<string, ChannelFixture[]>;
	forbiddenGuilds?: string[];
}) {
	return installFetchStub({
		match: /discord\.com\/api/,
		onRequest: ({ url }) => {
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/, '');
			const apiCall = { method: `GET ${path}`, body: {} };

			if (path === '/users/@me/guilds') {
				return { apiCall, responseBody: options.guilds };
			}

			const guildId = /^\/guilds\/(\d+)\/channels$/.exec(path)?.[1];
			if (guildId) {
				if (options.forbiddenGuilds?.includes(guildId)) {
					return { apiCall, responseBody: { message: 'Missing Access' }, status: 403 };
				}
				return { apiCall, responseBody: options.channelsByGuild[guildId] ?? [] };
			}

			return { apiCall, responseBody: {} };
		},
	});
}

async function search(query: string, limit = 10) {
	return (await searchDiscordChannels({
		apiUrl: API_URL,
		botToken: BOT_TOKEN,
		input: { query, limit },
	})) as { ok: boolean; channels: Array<Record<string, string>>; resultCount: number };
}

describe('searchDiscordChannels', () => {
	let stub: ReturnType<typeof installFetchStub>;

	afterEach(() => {
		stub?.restore();
	});

	it('resolves a channel name to the ID shape send_channel_message expects', async () => {
		stub = installDiscordStub({
			guilds: [GUILD_A],
			channelsByGuild: {
				[GUILD_A.id]: [{ id: '700000000000000001', name: 'general', type: 0 }],
			},
		});

		// A leading '#' and different casing are how people actually write it.
		const result = await search('#General');

		expect(result).toMatchObject({ ok: true, resultCount: 1 });
		expect(result.channels[0]).toEqual({
			channelId: `discord:${GUILD_A.id}:700000000000000001`,
			name: 'general',
			guildId: GUILD_A.id,
			guildName: 'n8n Test Server',
		});
	});

	it('ignores channels the agent cannot post a message into', async () => {
		stub = installDiscordStub({
			guilds: [GUILD_A],
			channelsByGuild: {
				[GUILD_A.id]: [
					{ id: '1', name: 'team-voice', type: 2 },
					{ id: '2', name: 'team-forum', type: 15 },
					{ id: '3', name: 'team-updates', type: 5 },
				],
			},
		});

		const result = await search('team');

		expect(result.channels.map((channel) => channel.name)).toEqual(['team-updates']);
	});

	it('keeps searching other servers when one refuses to list its channels', async () => {
		stub = installDiscordStub({
			guilds: [GUILD_A, GUILD_B],
			channelsByGuild: {
				[GUILD_B.id]: [{ id: '9', name: 'general', type: 0 }],
			},
			forbiddenGuilds: [GUILD_A.id],
		});

		const result = await search('general');

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
		stub = installDiscordStub({
			guilds: [GUILD_A],
			channelsByGuild: {
				[GUILD_A.id]: [
					{ id: '1', name: 'log-one', type: 0 },
					{ id: '2', name: 'log-two', type: 0 },
					{ id: '3', name: 'log-three', type: 0 },
				],
			},
		});

		const result = await search('log', 2);

		expect(result.resultCount).toBe(2);
	});
});
