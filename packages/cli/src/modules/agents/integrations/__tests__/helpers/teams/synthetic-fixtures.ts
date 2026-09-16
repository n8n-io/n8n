/**
 * Hand-built Bot Framework activities for the Teams channel tests.
 *
 * Teams has no recorded session yet, so these are written against Microsoft's
 * documented activity schema rather than captured from a tenant. They are fed
 * to the real `@chat-adapter/teams` adapter, so any shape the adapter rejects
 * fails the test rather than passing silently.
 */

export const TEAMS_APP_ID = '11111111-2222-3333-4444-555555555555';
export const TEAMS_CLIENT_SECRET = 'test-client-secret';
export const TEAMS_TENANT_ID = '99999999-8888-7777-6666-555555555555';
export const TEAMS_SERVICE_URL = 'https://smba.trafficmanager.net/amer';
export const TEAMS_DM_CONVERSATION_ID = 'a:1dm_conversation_alice';
export const TEAMS_USER_ID = '29:alice-teams-id';
const TEAMS_USER_AAD_ID = 'aad-alice';

export interface TeamsActivityFixture extends Record<string, unknown> {
	type: string;
	id: string;
	serviceUrl: string;
	conversation: { id: string; conversationType?: string; tenantId?: string; isGroup?: boolean };
	from: { id: string; name?: string; aadObjectId?: string };
	recipient: { id: string; name?: string };
	channelId: string;
	channelData?: Record<string, unknown>;
}

function baseActivity(overrides: Partial<TeamsActivityFixture> = {}): TeamsActivityFixture {
	return {
		type: 'message',
		id: 'activity-1',
		timestamp: new Date('2026-01-15T10:00:00.000Z').toISOString(),
		serviceUrl: TEAMS_SERVICE_URL,
		channelId: 'msteams',
		conversation: {
			id: TEAMS_DM_CONVERSATION_ID,
			conversationType: 'personal',
			tenantId: TEAMS_TENANT_ID,
		},
		from: { id: TEAMS_USER_ID, name: 'Alice', aadObjectId: TEAMS_USER_AAD_ID },
		recipient: { id: `28:${TEAMS_APP_ID}`, name: 'n8n Agent' },
		channelData: { tenant: { id: TEAMS_TENANT_ID } },
		...overrides,
	};
}

/** A first direct message from a user — the Teams equivalent of a mention. */
export const dmMessage: TeamsActivityFixture = baseActivity({
	id: 'activity-dm-1',
	text: 'hello agent',
});

export const dmFollowUp: TeamsActivityFixture = baseActivity({
	id: 'activity-dm-2',
	text: 'follow up',
});

/** A message the bot itself authored — must never trigger the agent. */
export const selfMessage: TeamsActivityFixture = baseActivity({
	id: 'activity-self-1',
	text: 'agent talking to itself',
	from: { id: `28:${TEAMS_APP_ID}`, name: 'n8n Agent' },
});

/**
 * An Adaptive Card button click. Teams delivers `Action.Submit` as a message
 * activity carrying `value` and no text.
 *
 * The click is derived from the activity that produced the card, so the
 * conversation and its `channelData` cannot drift apart: Teams never sends a
 * group chat conversation with the `channelData` of a direct message.
 */
export function cardAction(
	value: Record<string, unknown>,
	replyToId: string,
	from: TeamsActivityFixture = baseActivity(),
) {
	return baseActivity({
		id: 'activity-action-1',
		conversation: from.conversation,
		channelData: from.channelData,
		replyToId,
		value,
	});
}

const mentionEntity = {
	type: 'mention',
	text: '<at>n8n Agent</at>',
	mentioned: { id: `28:${TEAMS_APP_ID}`, name: 'n8n Agent' },
};

// ---------------------------------------------------------------------------
// Group chat
//
// A group chat conversation id carries no message id, so the whole chat is one
// conversation and one session.
// ---------------------------------------------------------------------------

export const TEAMS_GROUP_CHAT_CONVERSATION_ID = '19:group_chat_test@thread.v2';

function groupChatActivity(overrides: Partial<TeamsActivityFixture> = {}): TeamsActivityFixture {
	return baseActivity({
		conversation: {
			id: TEAMS_GROUP_CHAT_CONVERSATION_ID,
			conversationType: 'groupChat',
			tenantId: TEAMS_TENANT_ID,
			isGroup: true,
		},
		...overrides,
	});
}

export const groupChatMention: TeamsActivityFixture = groupChatActivity({
	id: 'activity-group-1',
	text: '<at>n8n Agent</at> hello agent',
	entities: [mentionEntity],
});
