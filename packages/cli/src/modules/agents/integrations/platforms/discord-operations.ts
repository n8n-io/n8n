import type { HttpRequestClient } from '@n8n/backend-network';
import { z } from 'zod';

import { connectionUnavailable, unsupportedQuery } from '../integration-helpers';

const PLATFORM = 'discord';

/** Discord message content hard limit. */
const DISCORD_MESSAGE_CONTENT_LIMIT = 2000;

const DISCORD_ATTACHMENT_HOST = 'cdn.discordapp.com';

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

export async function downloadDiscordAttachment(
	attachmentUrl: string,
	httpClient: HttpRequestClient,
): Promise<Buffer> {
	const url = new URL(attachmentUrl);
	if (
		url.protocol !== 'https:' ||
		url.username ||
		url.password ||
		url.hostname !== DISCORD_ATTACHMENT_HOST ||
		!url.pathname.startsWith('/attachments/')
	) {
		throw new Error('Invalid Discord attachment URL');
	}

	const response = await httpClient.request<Buffer>({
		method: 'GET',
		url: url.href,
		encoding: 'arraybuffer',
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		disableFollowRedirect: true,
		timeout: 30_000,
		abortSignal: AbortSignal.timeout(30_000),
	});
	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw new Error(`Discord attachment download failed with status ${response.statusCode}`);
	}
	return Buffer.from(response.body);
}

export const discordSearchChannelsSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(10),
	cursor: z.string().min(1).optional(),
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
 * adapter, whose `client` backs Slack's channel search), so requests use n8n's
 * outbound client directly.
 */
async function discordApiGet<T>(
	httpClient: HttpRequestClient,
	apiUrl: string,
	botToken: string,
	path: string,
): Promise<T> {
	const response = await httpClient.request<T>({
		method: 'GET',
		url: `${apiUrl}${path}`,
		headers: { Authorization: `Bot ${botToken}` },
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		sendCredentialsOnCrossOriginRedirect: false,
	});
	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw new Error(
			`Discord API ${path} failed: ${response.statusCode} ${JSON.stringify(response.body)}`,
		);
	}
	return response.body;
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
	httpClient: HttpRequestClient;
	apiUrl: string;
	botToken: string;
	input: DiscordSearchChannelsInput;
}): Promise<unknown> {
	const { httpClient, apiUrl, botToken, input } = params;
	const searchTerm = normalizeChannelName(input.query);
	const guildParams = new URLSearchParams({ limit: String(MAX_GUILDS_SCANNED) });
	if (input.cursor) guildParams.set('after', input.cursor);

	const guilds = await discordApiGet<DiscordGuild[]>(
		httpClient,
		apiUrl,
		botToken,
		`/users/@me/guilds?${guildParams.toString()}`,
	);
	const channels: DiscordChannelSearchResult[] = [];
	let lastScannedGuildId: string | undefined;

	for (const guild of guilds) {
		if (channels.length >= input.limit) break;
		lastScannedGuildId = guild.id;

		let guildChannels: DiscordChannel[];
		try {
			guildChannels = await discordApiGet<DiscordChannel[]>(
				httpClient,
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

	const hasUnscannedGuilds =
		lastScannedGuildId !== undefined && lastScannedGuildId !== guilds.at(-1)?.id;
	const nextCursor =
		lastScannedGuildId && (hasUnscannedGuilds || guilds.length === MAX_GUILDS_SCANNED)
			? lastScannedGuildId
			: undefined;

	return {
		ok: true,
		channels,
		resultCount: channels.length,
		...(nextCursor ? { nextCursor } : {}),
	};
}

export async function executeDiscordContextQuery(params: {
	httpClient: HttpRequestClient;
	apiUrl: string;
	botToken: string | undefined;
	query: string;
	input: Record<string, unknown>;
}): Promise<unknown> {
	if (params.query !== 'search_channels') return unsupportedQuery(PLATFORM, params.query);
	if (!params.botToken) return connectionUnavailable();

	return await searchDiscordChannels({
		httpClient: params.httpClient,
		apiUrl: params.apiUrl,
		botToken: params.botToken,
		input: discordSearchChannelsSchema.parse(params.input),
	});
}

/**
 * Target channel for a Discord REST message call. Encoded thread IDs are
 * `discord:<guild>:<channel>[:<thread>]` — prefer the thread segment when present.
 */
export function resolveDiscordMessageTargetChannelId(threadId: string): string {
	const parts = threadId.split(':');
	if (parts[0] !== 'discord' || parts.length < 3 || !parts[2]) {
		throw new Error(`Invalid Discord thread ID: ${threadId}`);
	}
	return parts[3] || parts[2];
}

/**
 * Settle an action card in place: replace content and clear embeds/components.
 * The Chat SDK string edit path omits those fields, which Discord treats as
 * "leave unchanged" — so buttons would otherwise stick around after a decision.
 */
export async function settleDiscordActionMessage(params: {
	httpClient: HttpRequestClient;
	apiUrl: string;
	botToken: string;
	threadId: string;
	messageId: string;
	content: string;
}): Promise<void> {
	const channelId = resolveDiscordMessageTargetChannelId(params.threadId);
	const content = params.content.slice(0, DISCORD_MESSAGE_CONTENT_LIMIT);
	const response = await params.httpClient.request({
		method: 'PATCH',
		url: `${params.apiUrl}/channels/${channelId}/messages/${params.messageId}`,
		headers: { Authorization: `Bot ${params.botToken}` },
		body: {
			content,
			embeds: [],
			components: [],
			allowed_mentions: { parse: [] },
		},
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		sendCredentialsOnCrossOriginRedirect: false,
	});
	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw new Error(
			`Discord API PATCH /channels/${channelId}/messages/${params.messageId} failed: ${response.statusCode}`,
		);
	}
}

export interface DiscordApplicationMetadata {
	id: string;
	verify_key: string;
}

/** Authenticated application metadata for the bot token (`GET /oauth2/applications/@me`). */
export async function fetchDiscordApplicationMetadata(params: {
	httpClient: HttpRequestClient;
	apiUrl: string;
	botToken: string;
}): Promise<
	| { ok: true; application: DiscordApplicationMetadata }
	| { ok: false; kind: 'http'; status: number }
	| { ok: false; kind: 'incomplete' }
> {
	const response = await params.httpClient.request<Partial<DiscordApplicationMetadata>>({
		method: 'GET',
		url: `${params.apiUrl}/oauth2/applications/@me`,
		headers: { Authorization: `Bot ${params.botToken}` },
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		sendCredentialsOnCrossOriginRedirect: false,
	});
	if (response.statusCode < 200 || response.statusCode >= 300) {
		return { ok: false, kind: 'http', status: response.statusCode };
	}
	const body = response.body;
	if (
		typeof body.id !== 'string' ||
		!body.id ||
		typeof body.verify_key !== 'string' ||
		!body.verify_key
	) {
		return { ok: false, kind: 'incomplete' };
	}
	return { ok: true, application: { id: body.id, verify_key: body.verify_key } };
}
