import { z } from 'zod';

import { unsupportedQuery } from '../integration-helpers';

const PLATFORM = 'discord';

/**
 * Guild channel types the agent can post into. Forums (15) are excluded: posting
 * there means opening a thread, which `send_channel_message` does not do.
 */
const POSTABLE_CHANNEL_TYPES = new Set([
	0, // GUILD_TEXT
	5, // GUILD_ANNOUNCEMENT
]);

/**
 * Upper bound on servers scanned per search. A bot invited to a handful of
 * servers is the norm; this stops a bot in hundreds from stalling an agent run
 * behind a fan-out of REST calls.
 */
const MAX_GUILDS_SCANNED = 20;

export const discordSearchChannelsSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(10),
});

export type DiscordSearchChannelsInput = z.infer<typeof discordSearchChannelsSchema>;

export interface DiscordChannelSearchResult {
	/** Pre-encoded for `send_channel_message`, which needs `discord:{guildId}:{channelId}`. */
	channelId: string;
	name: string;
	guildId: string;
	guildName: string;
}

interface DiscordGuild {
	id: string;
	name: string;
}

interface DiscordChannel {
	id: string;
	name?: string;
	type: number;
}

/**
 * Call the Discord REST API directly rather than through the adapter.
 *
 * `@chat-adapter/discord` exposes no client or request helper (unlike the Slack
 * adapter, whose `client` backs Slack's channel search), so there is nothing to
 * borrow. Telegram's integration reaches the Bot API the same way for
 * `setWebhook`. Global `fetch` matches what the adapter itself uses for every
 * Discord call, and the host is a fixed constant here, so there is no
 * user-controlled URL to guard against.
 */
async function discordApiGet<T>(apiUrl: string, botToken: string, path: string): Promise<T> {
	const response = await fetch(`${apiUrl}${path}`, {
		headers: { Authorization: `Bot ${botToken}` },
	});
	if (!response.ok) {
		throw new Error(`Discord API ${path} failed: ${response.status} ${await response.text()}`);
	}
	return (await response.json()) as T;
}

/** Match on a normalized name so "#General" and "general" both hit. */
function normalizeChannelName(value: string): string {
	return value.trim().replace(/^#/, '').toLowerCase();
}

/**
 * Resolve a channel name to the IDs the agent needs. Without this an agent with
 * no inbound message — a scheduled run, say — has no way to discover a channel,
 * because message context is the only other source of a channel ID.
 */
export async function searchDiscordChannels(params: {
	apiUrl: string;
	botToken: string;
	input: DiscordSearchChannelsInput;
}): Promise<unknown> {
	const { apiUrl, botToken, input } = params;
	const searchTerm = normalizeChannelName(input.query);

	const guilds = await discordApiGet<DiscordGuild[]>(apiUrl, botToken, '/users/@me/guilds');
	const channels: DiscordChannelSearchResult[] = [];

	for (const guild of guilds.slice(0, MAX_GUILDS_SCANNED)) {
		if (channels.length >= input.limit) break;

		let guildChannels: DiscordChannel[];
		try {
			guildChannels = await discordApiGet<DiscordChannel[]>(
				apiUrl,
				botToken,
				`/guilds/${guild.id}/channels`,
			);
		} catch {
			// The bot may lack permission to list a given server's channels; that
			// server simply contributes no matches rather than failing the search.
			continue;
		}

		for (const channel of guildChannels) {
			if (channels.length >= input.limit) break;
			if (!POSTABLE_CHANNEL_TYPES.has(channel.type) || !channel.name) continue;
			if (!normalizeChannelName(channel.name).includes(searchTerm)) continue;

			channels.push({
				channelId: `discord:${guild.id}:${channel.id}`,
				name: channel.name,
				guildId: guild.id,
				guildName: guild.name,
			});
		}
	}

	return { ok: true, channels, resultCount: channels.length };
}

export async function executeDiscordContextQuery(params: {
	apiUrl: string;
	botToken: string | undefined;
	query: string;
	input: Record<string, unknown>;
}): Promise<unknown> {
	if (params.query !== 'search_channels') return unsupportedQuery(PLATFORM, params.query);
	if (!params.botToken) return unsupportedQuery(PLATFORM, params.query);

	return await searchDiscordChannels({
		apiUrl: params.apiUrl,
		botToken: params.botToken,
		input: discordSearchChannelsSchema.parse(params.input),
	});
}
