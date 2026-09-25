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
export const TEAMS_CHANNEL_CONVERSATION_ID = '19:channel_deploys@thread.tacv2';
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

/**
 * A channel @-mention. Without RSC permissions Teams only delivers a mention in
 * a channel, so the mention entity is what makes this reach the agent at all.
 */
export const channelMention: TeamsActivityFixture = baseActivity({
	id: 'activity-channel-1',
	text: '<at>n8n Agent</at> hello agent',
	conversation: {
		id: TEAMS_CHANNEL_CONVERSATION_ID,
		conversationType: 'channel',
		tenantId: TEAMS_TENANT_ID,
		isGroup: true,
	},
	entities: [
		{
			type: 'mention',
			mentioned: { id: `28:${TEAMS_APP_ID}`, name: 'n8n Agent' },
			text: '<at>n8n Agent</at>',
		},
	],
	channelData: {
		tenant: { id: TEAMS_TENANT_ID },
		channel: { id: TEAMS_CHANNEL_CONVERSATION_ID },
	},
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
 */
export function cardAction(value: Record<string, unknown>, replyToId: string) {
	return baseActivity({
		id: 'activity-action-1',
		replyToId,
		value,
	});
}
