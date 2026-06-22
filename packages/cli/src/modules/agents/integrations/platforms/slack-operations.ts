import { z } from 'zod';
import { isRecord } from '@n8n/utils';

import type { ChatInstance } from '../chat-integration.service';
import {
	integrationError,
	stringValue,
	unsupportedAction,
	unsupportedQuery,
} from '../integration-helpers';
import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';
import type {
	IntegrationAction,
	IntegrationActionResult,
	IntegrationContextQuery,
	IntegrationMessageContext,
	IntegrationToolConnectionDescriptor,
} from '../integration-tools';

const PLATFORM = 'slack';

const getUserSchema = z.object({ userId: z.string().min(1) });
const getChannelInfoSchema = z.object({ channelId: z.string().min(1) });
const searchUsersSchema = z
	.object({
		query: z.string().min(1).optional(),
		email: z.string().min(1).optional(),
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
const addReactionSchema = z.object({
	emoji: z.string().min(1),
	threadId: z.string().min(1).optional(),
	messageId: z.string().min(1).optional(),
});

type SearchUsersInput = z.infer<typeof searchUsersSchema>;
type SearchChannelsInput = z.infer<typeof searchChannelsSchema>;
type AddReactionInput = z.infer<typeof addReactionSchema>;

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
	client?: SlackWebClient;
	withToken?: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
	addReaction?: (threadId: string, messageId: string, emoji: string) => Promise<void>;
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
}): Promise<unknown> {
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
		return await searchSlackUsers(params.chat, searchUsersSchema.parse(params.input));
	}

	if (params.query === 'search_channels') {
		return await searchSlackChannels(params.chat, searchChannelsSchema.parse(params.input));
	}

	return unsupportedQuery(PLATFORM, params.query);
}

export async function executeSlackAction(params: {
	chat: ChatInstance;
	descriptor: IntegrationToolConnectionDescriptor;
	action: IntegrationAction;
	input: Record<string, unknown>;
	currentMessageContext?: IntegrationMessageContext;
}): Promise<IntegrationActionResult | undefined> {
	if (params.action !== 'add_reaction') return undefined;
	return await addSlackReaction({
		chat: params.chat,
		descriptor: params.descriptor,
		input: addReactionSchema.parse(params.input),
		currentMessageContext: params.currentMessageContext,
	});
}

async function searchSlackUsers(chat: ChatInstance, input: SearchUsersInput): Promise<unknown> {
	const adapter = getSlackAdapter(chat);
	const usersApi = adapter?.client?.users;
	if (!adapter || !usersApi?.list) {
		return unsupportedQuery(PLATFORM, 'search_users');
	}

	const usersById = new Map<string, SlackUserSearchResult>();
	const searchTerm = normalizeSearchTerm(input.query ?? input.email ?? '');
	const email = input.email?.trim();

	// Only try users.lookupByEmail on the first page (cursor=undefined). Email
	// lookup is a single-result direct API; paging never replays it.
	if (!input.cursor && email && usersApi.lookupByEmail) {
		try {
			const response = await usersApi.lookupByEmail(await withSlackToken(adapter, { email }));
			const user = normalizeSlackUser(response.user);
			if (
				user &&
				shouldIncludeUser(response.user, input) &&
				matchesUserSearch(response.user, searchTerm, email)
			) {
				usersById.set(user.userId, user);
			}
		} catch {
			// Fall back to users.list, which can still match workspaces/scopes
			// that do not support users.lookupByEmail for this token.
		}
	}

	let cursor: string | undefined = input.cursor;
	while (usersById.size < input.limit) {
		const remainingLimit = input.limit - usersById.size;
		const response = await usersApi.list(
			await withSlackToken(adapter, {
				limit: remainingLimit,
				...(cursor ? { cursor } : {}),
			}),
		);
		for (const rawUser of response.members ?? []) {
			if (!shouldIncludeUser(rawUser, input) || !matchesUserSearch(rawUser, searchTerm, email)) {
				continue;
			}
			const user = normalizeSlackUser(rawUser);
			if (user) usersById.set(user.userId, user);
		}
		cursor = response.response_metadata?.next_cursor || undefined;
		if (!cursor) break;
	}

	const users = [...usersById.values()].slice(0, input.limit);
	return {
		ok: true,
		users,
		resultCount: users.length,
		...(cursor ? { nextCursor: cursor } : {}),
	};
}

async function searchSlackChannels(
	chat: ChatInstance,
	input: SearchChannelsInput,
): Promise<unknown> {
	const adapter = getSlackAdapter(chat);
	const conversationsApi = adapter?.client?.conversations;
	if (!adapter || !conversationsApi?.list) {
		return unsupportedQuery(PLATFORM, 'search_channels');
	}

	const channelsById = new Map<string, SlackChannelSearchResult>();
	const searchTerm = normalizeChannelSearchTerm(input.query);
	let cursor: string | undefined = input.cursor;

	while (channelsById.size < input.limit) {
		const remainingLimit = input.limit - channelsById.size;
		const response = await conversationsApi.list(
			await withSlackToken(adapter, {
				exclude_archived: !input.includeArchived,
				limit: remainingLimit,
				types: 'public_channel,private_channel',
				...(cursor ? { cursor } : {}),
			}),
		);

		for (const rawChannel of response.channels ?? []) {
			if (!input.includeArchived && rawChannel.is_archived === true) continue;
			if (!matchesChannelSearch(rawChannel, searchTerm)) continue;
			const channel = normalizeSlackChannel(rawChannel);
			if (channel) channelsById.set(channel.channelId, channel);
		}
		cursor = response.response_metadata?.next_cursor || undefined;
		if (!cursor) break;
	}

	const channels = [...channelsById.values()].slice(0, input.limit);
	return {
		ok: true,
		channels,
		resultCount: channels.length,
		...(cursor ? { nextCursor: cursor } : {}),
	};
}

async function addSlackReaction(params: {
	chat: ChatInstance;
	descriptor: IntegrationToolConnectionDescriptor;
	input: AddReactionInput;
	currentMessageContext?: IntegrationMessageContext;
}): Promise<IntegrationActionResult> {
	const adapter = getSlackAdapter(params.chat);
	if (!adapter || typeof adapter.addReaction !== 'function') {
		return unsupportedAction(PLATFORM, 'add_reaction');
	}

	const threadId = params.input.threadId ?? params.currentMessageContext?.target.threadId;
	const messageId = params.input.messageId ?? params.currentMessageContext?.messageId;
	if (!threadId || !messageId) {
		return integrationError(
			INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
			'Slack reactions require a messageId and threadId or current message context.',
		);
	}

	await adapter.addReaction(threadId, messageId, params.input.emoji);

	return {
		ok: true,
		reaction: { emoji: params.input.emoji, threadId, messageId },
		messageContext: {
			integrationConnectionId: params.descriptor.integrationConnectionId,
			platform: params.descriptor.integration.type,
			target: buildSlackReactionTarget(threadId, params.currentMessageContext),
			messageId,
			updatedAt: new Date().toISOString(),
		},
	};
}

export async function subscribeSlackThread(thread: {
	subscribe?: () => Promise<void>;
}): Promise<void> {
	await thread.subscribe?.();
}

function getSlackAdapter(chat: ChatInstance): SlackAdapter | undefined {
	const adapter = chat.getAdapter('slack');
	if (!isRecord(adapter)) return undefined;
	const candidate = adapter as {
		client?: unknown;
		withToken?: unknown;
		addReaction?: unknown;
	};
	if (candidate.client !== undefined && !isRecord(candidate.client)) return undefined;
	if (candidate.withToken !== undefined && typeof candidate.withToken !== 'function') {
		return undefined;
	}
	return adapter as unknown as SlackAdapter;
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

function buildSlackReactionTarget(
	threadId: string,
	currentMessageContext: IntegrationMessageContext | undefined,
): IntegrationMessageContext['target'] {
	if (currentMessageContext?.target.threadId === threadId) return currentMessageContext.target;

	const channelId = parseSlackChannelId(threadId);
	return {
		type: 'thread',
		threadId,
		...(channelId ? { channelId } : {}),
	};
}

function parseSlackChannelId(threadId: string): string | undefined {
	const [platform, channel] = threadId.split(':');
	if (platform !== 'slack' || !channel) return undefined;
	return `${platform}:${channel}`;
}
