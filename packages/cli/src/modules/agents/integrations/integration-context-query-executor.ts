import { Service } from '@n8n/di';
import { z } from 'zod';

import { ChatIntegrationService } from './chat-integration.service';
import type {
	IntegrationContextQuery,
	IntegrationContextQueryExecutor,
	IntegrationToolConnectionDescriptor,
} from './integration-tools';

const getUserInputSchema = z.object({
	userId: z.string().min(1),
});

const getChannelInfoInputSchema = z.object({
	channelId: z.string().min(1),
});

const searchUsersInputSchema = z
	.object({
		query: z.string().min(1).optional(),
		email: z.string().min(1).optional(),
		limit: z.number().int().min(1).max(50).default(10),
		includeBots: z.boolean().default(false),
		includeDeleted: z.boolean().default(false),
	})
	.refine((input) => input.query !== undefined || input.email !== undefined, {
		message: 'Provide query or email.',
	});

const searchChannelsInputSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(10),
	includeArchived: z.boolean().default(false),
});

@Service()
export class ChatIntegrationContextQueryExecutor implements IntegrationContextQueryExecutor {
	constructor(private readonly chatIntegrationService: ChatIntegrationService) {}

	async execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		query: IntegrationContextQuery;
		input: Record<string, unknown>;
		persistence?: { threadId: string; resourceId: string };
	}): Promise<unknown> {
		if (!params.descriptor.agentId) {
			return connectionUnavailable();
		}
		const chat = this.chatIntegrationService.getChatInstance(params.descriptor.agentId, {
			type: params.descriptor.integration.type,
			credentialId: params.descriptor.integration.credentialId,
		});
		if (!chat) {
			return connectionUnavailable();
		}

		try {
			if (params.query === 'get_user') {
				const input = getUserInputSchema.parse(params.input);
				const user = await chat.getUser(input.userId);
				return { ok: true, user };
			}

			if (params.query === 'search_users') {
				const input = searchUsersInputSchema.parse(params.input);
				return await searchSlackUsers(chat, input);
			}

			if (params.query === 'search_channels') {
				const input = searchChannelsInputSchema.parse(params.input);
				return await searchSlackChannels(chat, input);
			}

			if (params.query !== 'get_channel_info') {
				return {
					ok: false,
					error: {
						code: 'UNSUPPORTED_QUERY',
						message: `Unsupported context query: ${params.query}`,
					},
				};
			}

			const input = getChannelInfoInputSchema.parse(params.input);
			const channel = chat.channel(
				normalizePlatformId(params.descriptor.integration.type, input.channelId),
			);
			const channelInfo = await channel.fetchMetadata();
			return { ok: true, channel: channelInfo };
		} catch (error) {
			return {
				ok: false,
				error: {
					code: 'CONTEXT_QUERY_FAILED',
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}
}

function connectionUnavailable() {
	return {
		ok: false,
		error: {
			code: 'CONNECTION_NOT_AVAILABLE',
			message: 'The integration connection is not currently available.',
		},
	};
}

function normalizePlatformId(platform: string, id: string): string {
	return id.includes(':') ? id : `${platform}:${id}`;
}

type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;
type SearchChannelsInput = z.infer<typeof searchChannelsInputSchema>;

interface SlackUserSearchResult {
	userId: string;
	userName: string;
	fullName: string;
	email?: string;
	avatarUrl?: string;
	isBot: boolean;
}

interface SlackChannelSearchResult {
	channelId: string;
	name: string;
	isArchived: boolean;
	isMember: boolean;
	isPrivate: boolean;
	memberCount?: number;
}

interface SlackProfile {
	display_name?: unknown;
	email?: unknown;
	image_192?: unknown;
	real_name?: unknown;
}

interface SlackUser {
	deleted?: unknown;
	id?: unknown;
	is_bot?: unknown;
	name?: unknown;
	profile?: SlackProfile;
	real_name?: unknown;
}

interface SlackChannel {
	id?: unknown;
	is_archived?: unknown;
	is_member?: unknown;
	is_private?: unknown;
	name?: unknown;
	num_members?: unknown;
}

interface SlackUsersListResponse {
	members?: SlackUser[];
	response_metadata?: { next_cursor?: string };
}

interface SlackUserLookupResponse {
	user?: SlackUser;
}

interface SlackConversationsListResponse {
	channels?: SlackChannel[];
	response_metadata?: { next_cursor?: string };
}

interface SlackUsersApi {
	list?(options: Record<string, unknown>): Promise<SlackUsersListResponse>;
	lookupByEmail?(options: Record<string, unknown>): Promise<SlackUserLookupResponse>;
}

interface SlackConversationsApi {
	list?(options: Record<string, unknown>): Promise<SlackConversationsListResponse>;
}

interface SlackWebClient {
	conversations?: SlackConversationsApi;
	users?: SlackUsersApi;
}

interface SlackAdapter {
	client: SlackWebClient;
	withToken?: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

async function searchSlackUsers(
	chat: {
		getAdapter(name: string): unknown;
	},
	input: SearchUsersInput,
): Promise<unknown> {
	const adapter = getSlackAdapter(chat);
	const usersApi = adapter?.client.users;
	if (!adapter || !usersApi?.list) {
		return unsupportedSlackSearch('search_users');
	}

	const usersById = new Map<string, SlackUserSearchResult>();
	const searchTerm = normalizeSearchTerm(input.query ?? input.email ?? '');
	const email = input.email?.trim();

	if (email && adapter.client.users?.lookupByEmail) {
		try {
			const response = await adapter.client.users.lookupByEmail(
				await withSlackToken(adapter, { email }),
			);
			const user = normalizeSlackUser(response.user);
			if (
				user &&
				shouldIncludeUser(response.user, input) &&
				matchesUserSearch(response.user, searchTerm, email)
			) {
				usersById.set(user.userId, user);
			}
		} catch {
			// Fall back to users.list, which can still match workspaces/scopes that
			// do not support users.lookupByEmail for this token.
		}
	}

	let cursor: string | undefined;
	do {
		const response = await usersApi.list(
			await withSlackToken(adapter, { limit: 200, ...(cursor ? { cursor } : {}) }),
		);
		for (const rawUser of response.members ?? []) {
			if (!shouldIncludeUser(rawUser, input) || !matchesUserSearch(rawUser, searchTerm, email)) {
				continue;
			}
			const user = normalizeSlackUser(rawUser);
			if (user) usersById.set(user.userId, user);
			if (usersById.size >= input.limit) break;
		}
		cursor = response.response_metadata?.next_cursor || undefined;
	} while (cursor && usersById.size < input.limit);

	const users = [...usersById.values()].slice(0, input.limit);
	return { ok: true, users, resultCount: users.length };
}

async function searchSlackChannels(
	chat: {
		getAdapter(name: string): unknown;
	},
	input: SearchChannelsInput,
): Promise<unknown> {
	const adapter = getSlackAdapter(chat);
	const conversationsApi = adapter?.client.conversations;
	if (!adapter || !conversationsApi?.list) {
		return unsupportedSlackSearch('search_channels');
	}

	const channelsById = new Map<string, SlackChannelSearchResult>();
	const searchTerm = normalizeChannelSearchTerm(input.query);
	let cursor: string | undefined;

	do {
		const response = await conversationsApi.list(
			await withSlackToken(adapter, {
				exclude_archived: !input.includeArchived,
				limit: 200,
				types: 'public_channel,private_channel',
				...(cursor ? { cursor } : {}),
			}),
		);

		for (const rawChannel of response.channels ?? []) {
			if (!input.includeArchived && rawChannel.is_archived === true) continue;
			if (!matchesChannelSearch(rawChannel, searchTerm)) continue;
			const channel = normalizeSlackChannel(rawChannel);
			if (channel) channelsById.set(channel.channelId, channel);
			if (channelsById.size >= input.limit) break;
		}
		cursor = response.response_metadata?.next_cursor || undefined;
	} while (cursor && channelsById.size < input.limit);

	const channels = [...channelsById.values()].slice(0, input.limit);
	return { ok: true, channels, resultCount: channels.length };
}

function getSlackAdapter(chat: { getAdapter(name: string): unknown }): SlackAdapter | undefined {
	const adapter = chat.getAdapter('slack');
	return isSlackAdapter(adapter) ? adapter : undefined;
}

async function withSlackToken(
	adapter: SlackAdapter,
	options: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	if (!adapter.withToken) return options;
	return await adapter.withToken(options);
}

function unsupportedSlackSearch(query: 'search_users' | 'search_channels') {
	return {
		ok: false,
		error: {
			code: 'UNSUPPORTED_QUERY',
			message: `The active Slack connection does not support ${query}.`,
		},
	};
}

function normalizeSlackUser(user: SlackUser | undefined): SlackUserSearchResult | undefined {
	const userId = stringValue(user?.id);
	if (!userId) return undefined;
	const profile = user?.profile;
	const userName = stringValue(user?.name) ?? userId;
	const fullName =
		stringValue(user?.real_name) ??
		stringValue(profile?.real_name) ??
		stringValue(profile?.display_name) ??
		userName;

	return {
		userId,
		userName,
		fullName,
		...(stringValue(profile?.email) ? { email: stringValue(profile?.email) } : {}),
		...(stringValue(profile?.image_192) ? { avatarUrl: stringValue(profile?.image_192) } : {}),
		isBot: user?.is_bot === true,
	};
}

function normalizeSlackChannel(
	channel: SlackChannel | undefined,
): SlackChannelSearchResult | undefined {
	if (!channel) return undefined;
	const channelId = stringValue(channel?.id);
	const name = stringValue(channel?.name);
	if (!channelId || !name) return undefined;

	return {
		channelId,
		name: `#${name}`,
		isArchived: channel.is_archived === true,
		isMember: channel.is_member === true,
		isPrivate: channel.is_private === true,
		...(typeof channel.num_members === 'number' ? { memberCount: channel.num_members } : {}),
	};
}

function shouldIncludeUser(user: SlackUser | undefined, input: SearchUsersInput): boolean {
	if (!input.includeDeleted && user?.deleted === true) return false;
	if (!input.includeBots && user?.is_bot === true) return false;
	return true;
}

function matchesUserSearch(
	user: SlackUser | undefined,
	searchTerm: string,
	email: string | undefined,
): boolean {
	const fields = [
		stringValue(user?.id),
		stringValue(user?.name),
		stringValue(user?.real_name),
		stringValue(user?.profile?.display_name),
		stringValue(user?.profile?.real_name),
		stringValue(user?.profile?.email),
	]
		.filter((field): field is string => field !== undefined)
		.map(normalizeSearchTerm);

	if (email) {
		const normalizedEmail = normalizeSearchTerm(email);
		if (fields.some((field) => field === normalizedEmail)) return true;
	}

	return fields.some((field) => field.includes(searchTerm));
}

function matchesChannelSearch(channel: SlackChannel | undefined, searchTerm: string): boolean {
	const fields = [stringValue(channel?.id), stringValue(channel?.name)]
		.filter((field): field is string => field !== undefined)
		.map(normalizeChannelSearchTerm);
	return fields.some((field) => field.includes(searchTerm));
}

function normalizeSearchTerm(value: string): string {
	return value.trim().toLowerCase().replace(/^@/, '');
}

function normalizeChannelSearchTerm(value: string): string {
	return value.trim().toLowerCase().replace(/^#/, '');
}

function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isSlackAdapter(value: unknown): value is SlackAdapter {
	if (!isRecord(value) || !isRecord(value.client)) return false;
	if (
		'withToken' in value &&
		value.withToken !== undefined &&
		typeof value.withToken !== 'function'
	) {
		return false;
	}
	return true;
}
