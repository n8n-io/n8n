import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

// Discord Gateway intent bits (https://discord.com/developers/docs/topics/gateway#gateway-intents)
const Intents = {
	GUILD_MEMBERS: 1 << 1, // privileged
	GUILD_MESSAGES: 1 << 9,
	GUILD_MESSAGE_REACTIONS: 1 << 10,
	MESSAGE_CONTENT: 1 << 15, // privileged
} as const;

interface EventDefinition {
	/** Value stored in the node parameter. */
	value: string;
	/** The Gateway DISPATCH event name this maps to. */
	gatewayEvent: string;
	/** Intent bits required to receive this event. */
	intents: number;
	/** Whether the event payload carries a channel (so the channel filter applies). */
	hasChannel: boolean;
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
	{
		value: 'messageCreate',
		gatewayEvent: 'MESSAGE_CREATE',
		intents: Intents.GUILD_MESSAGES | Intents.MESSAGE_CONTENT,
		hasChannel: true,
	},
	{
		value: 'messageUpdate',
		gatewayEvent: 'MESSAGE_UPDATE',
		intents: Intents.GUILD_MESSAGES | Intents.MESSAGE_CONTENT,
		hasChannel: true,
	},
	{
		value: 'messageDelete',
		gatewayEvent: 'MESSAGE_DELETE',
		intents: Intents.GUILD_MESSAGES,
		hasChannel: true,
	},
	{
		value: 'reactionAdd',
		gatewayEvent: 'MESSAGE_REACTION_ADD',
		intents: Intents.GUILD_MESSAGE_REACTIONS,
		hasChannel: true,
	},
	{
		value: 'reactionRemove',
		gatewayEvent: 'MESSAGE_REACTION_REMOVE',
		intents: Intents.GUILD_MESSAGE_REACTIONS,
		hasChannel: true,
	},
	{
		value: 'memberAdd',
		gatewayEvent: 'GUILD_MEMBER_ADD',
		intents: Intents.GUILD_MEMBERS,
		hasChannel: false,
	},
	{
		value: 'memberRemove',
		gatewayEvent: 'GUILD_MEMBER_REMOVE',
		intents: Intents.GUILD_MEMBERS,
		hasChannel: false,
	},
	{
		value: 'memberUpdate',
		gatewayEvent: 'GUILD_MEMBER_UPDATE',
		intents: Intents.GUILD_MEMBERS,
		hasChannel: false,
	},
];

const BY_GATEWAY_EVENT = new Map(EVENT_DEFINITIONS.map((def) => [def.gatewayEvent, def]));

/** OR together the intents required by the selected events. */
export function computeIntents(selectedEvents: string[]): number {
	return EVENT_DEFINITIONS.filter((def) => selectedEvents.includes(def.value)).reduce(
		(bits, def) => bits | def.intents,
		0,
	);
}

export interface EventFilters {
	selectedEvents: string[];
	guildId: string;
	/** Channel ids to listen to. Empty = all channels. */
	channelIds: string[];
	/** Drop events triggered by any bot (incl. this one), where the actor is known. */
	ignoreBots: boolean;
	/** Drop events triggered by this bot's own user (messages & reactions). */
	excludeSelf: boolean;
	/** This bot's own user id (from the gateway READY payload). */
	botUserId?: string;
	/** Only fire when the actor has at least one of these role ids. */
	includeRoles: string[];
	/** Drop when the actor has any of these role ids. */
	excludeRoles: string[];
	/** MIME glob patterns; a message must have an attachment matching one. Empty = no filter. */
	attachmentContentTypes: string[];
}

/**
 * Normalize a comma-separated content-type filter: trim, lowercase, drop blanks
 * so " ", ", ," or stray spaces collapse to an empty list (no filtering).
 */
export function parseContentTypeFilter(raw: string | undefined): string[] {
	if (!raw) return [];
	return raw
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry.length > 0);
}

/** Match a MIME type against a glob pattern (`*`, `image/*`, `image/png`). */
function mimeMatches(contentType: string, pattern: string): boolean {
	if (pattern === '*' || pattern === '*/*') return true; // any attachment
	if (!contentType) return false; // unknown type only matches a bare `*`
	const [patternType = '', patternSub] = pattern.split('/');
	const [type = '', sub = ''] = contentType.split('/');
	const typeOk = patternType === '*' || patternType === type;
	const subOk =
		patternSub === undefined || patternSub === '' || patternSub === '*' || patternSub === sub;
	return typeOk && subOk;
}

/**
 * Whether the event's actor is a bot, when the payload says so. `undefined` when
 * unknown (reaction-removed / message-deleted carry no actor) - treated as pass-through.
 */
function getActorBotFlag(eventValue: string, data: IDataObject): boolean | undefined {
	if (eventValue === 'messageCreate' || eventValue === 'messageUpdate') {
		return (data.author as { bot?: boolean } | undefined)?.bot;
	}
	// A guild reaction-add embeds the reacting member, whose user carries the flag.
	if (eventValue === 'reactionAdd') {
		return (data.member as { user?: { bot?: boolean } } | undefined)?.user?.bot;
	}
	// Member events are (or carry) a guild member object with the user.
	if (
		eventValue === 'memberAdd' ||
		eventValue === 'memberRemove' ||
		eventValue === 'memberUpdate'
	) {
		return (data.user as { bot?: boolean } | undefined)?.bot;
	}
	return undefined;
}

/** The id of the user that triggered the event (messages & reactions only). */
function getActorId(eventValue: string, data: IDataObject): string | undefined {
	if (eventValue === 'messageCreate' || eventValue === 'messageUpdate') {
		return (data.author as { id?: string } | undefined)?.id;
	}
	if (eventValue === 'reactionAdd' || eventValue === 'reactionRemove') {
		return data.user_id as string | undefined;
	}
	return undefined;
}

/**
 * The actor's guild role ids, where the payload carries them. `undefined` when
 * absent (message-delete, member-left, webhook/system) - treated as pass-through.
 */
function getActorRoleIds(eventValue: string, data: IDataObject): string[] | undefined {
	// Member add/update carry the member's roles at the top level.
	if (eventValue === 'memberAdd' || eventValue === 'memberUpdate') {
		return data.roles as string[] | undefined;
	}
	// Messages and reactions embed a partial guild member with roles.
	return (data.member as { roles?: string[] } | undefined)?.roles;
}

/**
 * Decide whether a dispatched Gateway event should fire the trigger and, if so,
 * build the output item. Returns `null` when the event doesn't match.
 */
export function buildEventItems(
	gatewayEvent: string,
	data: IDataObject,
	filters: EventFilters,
): INodeExecutionData[] | null {
	const def = BY_GATEWAY_EVENT.get(gatewayEvent);
	if (!def || !filters.selectedEvents.includes(def.value)) return null;

	// Scope to the configured server. Events without a guild (e.g. DMs) are
	// dropped when a server filter is set.
	if (filters.guildId) {
		const eventGuildId = data.guild_id as string | undefined;
		if (eventGuildId !== filters.guildId) return null;
	}

	// Optional channel filter (only meaningful for events that carry a channel).
	// An empty list means "all channels", so no filtering is applied.
	if (filters.channelIds.length && def.hasChannel) {
		const eventChannelId = data.channel_id as string | undefined;
		if (!eventChannelId || !filters.channelIds.includes(eventChannelId)) return null;
	}

	// Drop events triggered by bots (any bot, including this one), wherever the
	// actor's bot status is known. Unknown (reaction-removed, message-deleted)
	// passes through.
	if (filters.ignoreBots && getActorBotFlag(def.value, data)) {
		return null;
	}

	// Drop this bot's own messages/reactions (loop prevention).
	if (filters.excludeSelf && filters.botUserId) {
		const actorId = getActorId(def.value, data);
		if (actorId && actorId === filters.botUserId) return null;
	}

	// Role include/exclude - only applied when the payload carries role data.
	if (filters.includeRoles.length || filters.excludeRoles.length) {
		const roleIds = getActorRoleIds(def.value, data);
		if (roleIds !== undefined) {
			if (filters.excludeRoles.length && roleIds.some((id) => filters.excludeRoles.includes(id))) {
				return null;
			}
			if (filters.includeRoles.length && !roleIds.some((id) => filters.includeRoles.includes(id))) {
				return null;
			}
		}
	}

	// Attachment content-type filter - only gates new/edited messages (the only
	// events carrying an attachments array); other events pass through.
	if (
		filters.attachmentContentTypes.length &&
		(def.value === 'messageCreate' || def.value === 'messageUpdate')
	) {
		const attachments = (data.attachments as Array<{ content_type?: string }> | undefined) ?? [];
		const matches = attachments.some((attachment) =>
			filters.attachmentContentTypes.some((pattern) =>
				mimeMatches((attachment.content_type ?? '').toLowerCase(), pattern),
			),
		);
		if (!matches) return null;
	}

	return [{ json: { eventType: def.value, ...data } }];
}
