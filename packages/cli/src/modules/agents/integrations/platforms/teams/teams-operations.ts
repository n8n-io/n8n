import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import type { ChatInstance } from '../../chat-integration.service';
import { INTEGRATION_ERROR_CODES } from '../../integration-error-codes';
import { integrationError, stringProperty, unsupportedQuery } from '../../integration-helpers';
import type { IntegrationContextQuery } from '../../integration-tool-types';
import { odataLiteral } from './teams-graph.service';
import { graphHttpOf, statusOf, type GraphHttp } from './teams-message-files';

const PLATFORM = 'teams';
const GRAPH_V1 = 'https://graph.microsoft.com/v1.0';
const USER_FIELDS = 'id,displayName,mail,userPrincipalName';

/** Each team costs one channel request, so a large tenant is searched only in part. */
const MAX_TEAMS_SEARCHED = 50;
const CHANNEL_REQUESTS_AT_ONCE = 5;
const PARTIAL_CHANNEL_SEARCH = `Some teams or channels in this organisation were not searched: at most ${MAX_TEAMS_SEARCHED} teams and the first page of channels in each. If the channel is missing, ask someone to mention the bot in it once and use the channelId from get_current_message_context.`;

const getUserSchema = z.object({ userId: z.string().min(1) });
const searchUsersSchema = z.object({
	query: z.string().trim().min(1).optional(),
	email: z.string().trim().min(1).optional(),
	limit: z.number().int().min(1).max(50).default(10),
});
const searchChannelsSchema = z.object({
	query: z.string().trim().min(1),
	limit: z.number().int().min(1).max(50).default(10),
});

const NOT_APPROVED = {
	users:
		'A Microsoft administrator has not approved finding people for this app yet. Ask for the Teams user ID of the person instead, or ask an admin to approve the User.ReadBasic.All permission in the Teams channel settings.',
	channels:
		'A Microsoft administrator has not approved finding teams and channels for this app yet. Ask someone to mention the bot in the channel once and use the channelId from get_current_message_context, or ask an admin to approve the Team.ReadBasic.All and Channel.ReadBasic.All permissions in the Teams channel settings.',
};

interface TeamsUserResult {
	userId: string;
	fullName: string;
	email?: string;
	userName?: string;
	isBot: false;
}

interface TeamsChannelResult {
	channelId: string;
	name: string;
	teamId: string;
	teamName: string;
}

export async function executeTeamsContextQuery(params: {
	chat: ChatInstance;
	query: IntegrationContextQuery;
	input: Record<string, unknown>;
}): Promise<unknown> {
	const { chat, query, input } = params;
	const http = graphHttpOf(chat.getAdapter(PLATFORM));
	if (!http) return unsupportedQuery(PLATFORM, query);

	if (query === 'get_user') {
		const { userId } = getUserSchema.parse(input);
		// A Bot Framework ID is not a Graph ID; the adapter maps it from what it cached.
		if (userId.startsWith('29:')) return { ok: true, user: await chat.getUser(userId) };
		return await withGraphAccess('users', async () => ({
			ok: true,
			user: await getGraphUser(http, userId),
		}));
	}

	if (query === 'search_users') {
		const parsed = searchUsersSchema.parse(input);
		return await withGraphAccess('users', async () => {
			const users = await searchGraphUsers(http, parsed);
			return { ok: true, users, resultCount: users.length };
		});
	}

	if (query === 'search_channels') {
		const parsed = searchChannelsSchema.parse(input);
		return await withGraphAccess('channels', async () => {
			const { channels, partial } = await searchGraphChannels(http, parsed);
			return {
				ok: true,
				channels,
				resultCount: channels.length,
				...(partial ? { note: PARTIAL_CHANNEL_SEARCH } : {}),
			};
		});
	}

	return unsupportedQuery(PLATFORM, query);
}

async function withGraphAccess(
	scope: keyof typeof NOT_APPROVED,
	run: () => Promise<unknown>,
): Promise<unknown> {
	try {
		return await run();
	} catch (error) {
		if (statusOf(error) === 403) {
			return integrationError(INTEGRATION_ERROR_CODES.PERMISSION_NOT_GRANTED, NOT_APPROVED[scope]);
		}
		throw error;
	}
}

async function getGraphUser(http: GraphHttp, id: string): Promise<TeamsUserResult | null> {
	try {
		const { data } = await http.get(
			`${GRAPH_V1}/users/${encodeURIComponent(id)}?$select=${USER_FIELDS}`,
		);
		return toUser(data) ?? null;
	} catch (error) {
		if (statusOf(error) === 404) return null;
		throw error;
	}
}

async function searchGraphUsers(
	http: GraphHttp,
	input: z.infer<typeof searchUsersSchema>,
): Promise<TeamsUserResult[]> {
	const email = input.email ?? (input.query?.includes('@') ? input.query : undefined);
	if (email) {
		const address = odataString(email);
		return await listUsers(
			http,
			`userPrincipalName eq ${address} or mail eq ${address}`,
			input.limit,
		);
	}

	const term = odataString(input.query ?? '');
	return await listUsers(
		http,
		`startswith(displayName,${term}) or startswith(mail,${term}) or startswith(userPrincipalName,${term})`,
		input.limit,
	);
}

async function listUsers(http: GraphHttp, filter: string, limit: number) {
	const query = new URLSearchParams({ $filter: filter, $select: USER_FIELDS, $top: String(limit) });
	const { data } = await http.get(`${GRAPH_V1}/users?${query.toString()}`);
	return valuesOf(data)
		.map(toUser)
		.filter((user): user is TeamsUserResult => user !== undefined);
}

async function searchGraphChannels(
	http: GraphHttp,
	input: z.infer<typeof searchChannelsSchema>,
): Promise<{ channels: TeamsChannelResult[]; partial: boolean }> {
	const query = new URLSearchParams({
		$select: 'id,displayName',
		$top: String(MAX_TEAMS_SEARCHED),
	});
	const { data } = await http.get(`${GRAPH_V1}/teams?${query.toString()}`);
	const teams = valuesOf(data).flatMap((team) => {
		const id = stringProperty(team, 'id');
		return id ? [{ id, name: stringProperty(team, 'displayName') ?? id }] : [];
	});

	const words = normalize(input.query).split(' ');
	const matches: TeamsChannelResult[] = [];
	let partial = hasNextPage(data);
	for (
		let start = 0;
		start < teams.length && matches.length < input.limit;
		start += CHANNEL_REQUESTS_AT_ONCE
	) {
		const batch = teams.slice(start, start + CHANNEL_REQUESTS_AT_ONCE);
		const channelLists = await Promise.all(
			batch.map(async (team) => {
				const channels = await http
					.get(`${GRAPH_V1}/teams/${encodeURIComponent(team.id)}/channels?$select=id,displayName`)
					.then(({ data: body }) => {
						if (hasNextPage(body)) partial = true;
						return valuesOf(body);
					})
					.catch((error: unknown) => {
						// A team removed after it was listed has no channels left to read.
						if (statusOf(error) === 404) return [];
						throw error;
					});
				return channels.flatMap((channel) => {
					const channelId = stringProperty(channel, 'id');
					if (!channelId) return [];
					const name = stringProperty(channel, 'displayName') ?? channelId;
					return [{ channelId, name, teamId: team.id, teamName: team.name }];
				});
			}),
		);
		for (const channel of channelLists.flat()) {
			const haystack = normalize(`${channel.teamName} ${channel.name}`);
			if (words.every((word) => haystack.includes(word))) matches.push(channel);
		}
	}
	return {
		channels: matches.slice(0, input.limit),
		partial,
	};
}

function hasNextPage(data: unknown): boolean {
	return isRecord(data) && typeof data['@odata.nextLink'] === 'string';
}

function toUser(value: unknown): TeamsUserResult | undefined {
	const userId = stringProperty(value, 'id');
	if (!userId) return undefined;
	const email = stringProperty(value, 'mail') ?? stringProperty(value, 'userPrincipalName');
	return {
		userId,
		fullName: stringProperty(value, 'displayName') ?? email ?? userId,
		email,
		userName: stringProperty(value, 'userPrincipalName'),
		isBot: false,
	};
}

function valuesOf(data: unknown): unknown[] {
	return isRecord(data) && Array.isArray(data.value) ? data.value : [];
}

function odataString(value: string): string {
	return `'${odataLiteral(value)}'`;
}

function normalize(value: string): string {
	return value.toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ').trim();
}
