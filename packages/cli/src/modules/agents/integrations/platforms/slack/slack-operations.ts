import { z } from 'zod';
import { isRecord } from '@n8n/utils/is-record';

import {
	readSlackSearchCursor,
	selectSlackSearchPage,
	SLACK_SEARCH_PAGE_SIZE,
} from './slack-search-pagination';

import type { ChatInstance } from '../../chat-integration.service';
import { INTEGRATION_ERROR_CODES } from '../../integration-error-codes';
import { integrationError, stringValue, unsupportedQuery } from '../../integration-helpers';
import type { IntegrationContextQuery } from '../../integration-tools';

const PLATFORM = 'slack';
const MAX_SEARCH_PAGES = 5;

const getUserSchema = z.object({ userId: z.string().min(1) });
const getChannelInfoSchema = z.object({ channelId: z.string().min(1) });
const searchUsersSchema = z
	.object({
		query: z.string().trim().min(1).optional(),
		email: z.string().trim().min(1).optional(),
		limit: z.number().int().min(1).max(50).default(10),
		cursor: z.string().min(1).optional(),
		includeBots: z.boolean().default(false),
		includeDeleted: z.boolean().default(false),
	})
	.refine((input) => input.query !== undefined || input.email !== undefined, {
		message: 'Provide query or email.',
	});
const searchChannelsSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(10),
	cursor: z.string().min(1).optional(),
	includeArchived: z.boolean().default(false),
});

type SearchUsersInput = z.infer<typeof searchUsersSchema>;
type SearchChannelsInput = z.infer<typeof searchChannelsSchema>;

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
	info?(options: Record<string, unknown>): Promise<SlackUserLookupResponse>;
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
	client?: SlackWebClient;
	withToken?: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

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

export async function executeSlackContextQuery(params: {
	chat: ChatInstance;
	query: IntegrationContextQuery;
	input: Record<string, unknown>;
	abortSignal?: AbortSignal;
}): Promise<unknown> {
	params.abortSignal?.throwIfAborted();
	if (params.query === 'get_user') {
		const input = getUserSchema.parse(params.input);
		const user = await params.chat.getUser(input.userId);
		return { ok: true, user };
	}

	if (params.query === 'get_channel_info') {
		const input = getChannelInfoSchema.parse(params.input);
		const channel = params.chat.channel(normalizeChannelId(input.channelId));
		const channelInfo = await channel.fetchMetadata();
		return { ok: true, channel: channelInfo };
	}

	if (params.query === 'search_users') {
		return await searchSlackUsers(
			params.chat,
			searchUsersSchema.parse(params.input),
			params.abortSignal,
		);
	}

	if (params.query === 'search_channels') {
		return await searchSlackChannels(
			params.chat,
			searchChannelsSchema.parse(params.input),
			params.abortSignal,
		);
	}

	return unsupportedQuery(PLATFORM, params.query);
}

async function searchSlackUsers(
	chat: ChatInstance,
	input: SearchUsersInput,
	abortSignal?: AbortSignal,
): Promise<unknown> {
	const adapter = getSlackAdapter(chat);
	const usersApi = adapter?.client?.users;
	if (!adapter || !usersApi) return unsupportedQuery(PLATFORM, 'search_users');

	const userId = input.query?.replace(/^<@([^>]+)>$/, '$1');
	if (
		!input.email &&
		!input.cursor &&
		userId &&
		/^[UW][A-Z0-9]{8,}$/.test(userId) &&
		usersApi.info
	) {
		try {
			const options = await withSlackToken(adapter, { user: userId });
			abortSignal?.throwIfAborted();
			const response = await usersApi.info(options);
			return userLookupResult(response.user, input);
		} catch (error) {
			abortSignal?.throwIfAborted();
			const code = slackErrorCode(error);
			if (code !== 'user_not_found') throw error;
			if (input.query?.startsWith('<@')) return userLookupResult(undefined, input);
			// A plain uppercase name can also match the user ID format.
		}
	}

	const parsedEmail = z.string().email().safeParse(input.query);
	const email = input.email ?? (parsedEmail.success ? parsedEmail.data : undefined);
	if (!input.cursor && email && usersApi.lookupByEmail) {
		try {
			const options = await withSlackToken(adapter, { email });
			abortSignal?.throwIfAborted();
			const response = await usersApi.lookupByEmail(options);
			return userLookupResult(response.user, input);
		} catch (error) {
			abortSignal?.throwIfAborted();
			const code = slackErrorCode(error);
			if (code === 'missing_scope') {
				return integrationError(
					INTEGRATION_ERROR_CODES.PERMISSION_NOT_GRANTED,
					'The Slack connection needs the users:read.email permission to search by email. Add this permission and reinstall the Slack app, or search with a name or Slack mention.',
				);
			}
			if (code === 'users_not_found' && !input.includeDeleted) {
				return { ok: true, users: [], resultCount: 0 };
			}
			// The directory can contain deactivated users that email lookup excludes.
			if (code !== 'users_not_found') throw error;
		}
	}
	if (!usersApi.list) return unsupportedQuery(PLATFORM, 'search_users');

	const searchTerm = normalizeSearchTerm(input.query ?? email ?? '');
	const searchKey = JSON.stringify({
		query: searchTerm,
		email: email ? normalizeSearchTerm(email) : undefined,
		includeBots: input.includeBots,
		includeDeleted: input.includeDeleted,
	});
	let cursor = input.cursor;
	let position = readSlackSearchCursor('users', searchKey, cursor);
	for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
		const options = await withSlackToken(adapter, {
			limit: SLACK_SEARCH_PAGE_SIZE,
			...(position.cursor ? { cursor: position.cursor } : {}),
		});
		abortSignal?.throwIfAborted();
		const response = await usersApi.list(options);
		abortSignal?.throwIfAborted();
		const matches = new Map<string, SlackUserSearchResult>();
		for (const rawUser of response.members ?? []) {
			if (!shouldIncludeUser(rawUser, input) || !matchesUserSearch(rawUser, searchTerm, email))
				continue;
			const user = normalizeSlackUser(rawUser);
			if (user) matches.set(user.userId, user);
		}
		const { results: users, nextCursor } = selectSlackSearchPage({
			kind: 'users',
			searchKey,
			matches: [...matches.values()],
			limit: input.limit,
			position,
			nextCursor: response.response_metadata?.next_cursor || undefined,
		});
		if (users.length > 0 || !nextCursor) {
			return { ok: true, users, resultCount: users.length, ...(nextCursor ? { nextCursor } : {}) };
		}
		cursor = nextCursor;
		position = readSlackSearchCursor('users', searchKey, cursor);
	}
	return {
		...integrationError(
			INTEGRATION_ERROR_CODES.CONTEXT_SEARCH_INCOMPLETE,
			'The Slack user search is incomplete. Use nextQuery to continue the search. Do not report that the user does not exist. If you cannot continue, explain that the search is incomplete and ask for a Slack mention or an exact email address.',
		),
		searchComplete: false,
		nextCursor: cursor,
		nextQuery: { query: 'search_users', input: { ...input, cursor } },
	};
}

function userLookupResult(rawUser: SlackUser | undefined, input: SearchUsersInput) {
	const user = shouldIncludeUser(rawUser, input) ? normalizeSlackUser(rawUser) : undefined;
	const users = user ? [user] : [];
	return { ok: true, users, resultCount: users.length };
}

async function searchSlackChannels(
	chat: ChatInstance,
	input: SearchChannelsInput,
	abortSignal?: AbortSignal,
): Promise<unknown> {
	const adapter = getSlackAdapter(chat);
	const conversationsApi = adapter?.client?.conversations;
	if (!adapter || !conversationsApi?.list) return unsupportedQuery(PLATFORM, 'search_channels');

	const searchTerm = normalizeChannelSearchTerm(input.query);
	const searchKey = JSON.stringify({ query: searchTerm, includeArchived: input.includeArchived });
	let cursor = input.cursor;
	let position = readSlackSearchCursor('channels', searchKey, cursor);
	for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
		const options = await withSlackToken(adapter, {
			exclude_archived: !input.includeArchived,
			limit: SLACK_SEARCH_PAGE_SIZE,
			types: 'public_channel,private_channel',
			...(position.cursor ? { cursor: position.cursor } : {}),
		});
		abortSignal?.throwIfAborted();
		const response = await conversationsApi.list(options);
		abortSignal?.throwIfAborted();
		const matches = new Map<string, SlackChannelSearchResult>();
		for (const rawChannel of response.channels ?? []) {
			if (!input.includeArchived && rawChannel.is_archived === true) continue;
			if (!matchesChannelSearch(rawChannel, searchTerm)) continue;
			const channel = normalizeSlackChannel(rawChannel);
			if (channel) matches.set(channel.channelId, channel);
		}
		const { results: channels, nextCursor } = selectSlackSearchPage({
			kind: 'channels',
			searchKey,
			matches: [...matches.values()],
			limit: input.limit,
			position,
			nextCursor: response.response_metadata?.next_cursor || undefined,
		});
		if (channels.length > 0 || !nextCursor) {
			return {
				ok: true,
				channels,
				resultCount: channels.length,
				...(nextCursor ? { nextCursor } : {}),
			};
		}
		cursor = nextCursor;
		position = readSlackSearchCursor('channels', searchKey, cursor);
	}
	return {
		...integrationError(
			INTEGRATION_ERROR_CODES.CONTEXT_SEARCH_INCOMPLETE,
			'The Slack channel search is incomplete. Use nextQuery to continue the search. Do not report that the channel does not exist. If you cannot continue, explain that the search is incomplete and ask for a channel ID.',
		),
		searchComplete: false,
		nextCursor: cursor,
		nextQuery: { query: 'search_channels', input: { ...input, cursor } },
	};
}

export async function subscribeSlackThread(thread: {
	subscribe?: () => Promise<void>;
}): Promise<void> {
	await thread.subscribe?.();
}

function slackErrorCode(error: unknown): string | undefined {
	if (!isRecord(error) || !isRecord(error.data)) return undefined;
	return stringValue(error.data.error);
}

function getSlackAdapter(chat: ChatInstance): SlackAdapter | undefined {
	const adapter = chat.getAdapter('slack');
	if (!isRecord(adapter)) return undefined;
	const candidate = adapter as {
		client?: unknown;
		withToken?: unknown;
	};
	if (candidate.client !== undefined && !isRecord(candidate.client)) return undefined;
	if (candidate.withToken !== undefined && typeof candidate.withToken !== 'function') {
		return undefined;
	}
	return adapter;
}

async function withSlackToken(
	adapter: SlackAdapter,
	options: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	if (!adapter.withToken) return options;
	return await adapter.withToken(options);
}

function normalizeChannelId(id: string): string {
	return id.includes(':') ? id : `slack:${id}`;
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

	const email = stringValue(profile?.email);
	const avatarUrl = stringValue(profile?.image_192);

	return {
		userId,
		userName,
		fullName,
		...(email ? { email } : {}),
		...(avatarUrl ? { avatarUrl } : {}),
		isBot: user?.is_bot === true,
	};
}

function normalizeSlackChannel(
	channel: SlackChannel | undefined,
): SlackChannelSearchResult | undefined {
	if (!channel) return undefined;
	const channelId = stringValue(channel.id);
	const name = stringValue(channel.name);
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
	return value.trim().toLowerCase().replace(/^[#@]/, '');
}

function normalizeChannelSearchTerm(value: string): string {
	return normalizeSearchTerm(value);
}
