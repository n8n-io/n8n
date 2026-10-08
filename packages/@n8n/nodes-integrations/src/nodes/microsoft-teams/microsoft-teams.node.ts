import {
	defineNode,
	defineResource,
	isHttpError,
	matches,
	parse,
	ref,
	t,
	type EncodedPath,
	type Http,
} from '@n8n/node-sdk';
import { compat, credential } from '@n8n/node-sdk/credentials';

import { microsoftTeamsOAuth2 } from './credentials';

const GRAPH = 'https://graph.microsoft.com';

// The legacy type stays the definition: core runs its Microsoft sign-in, also with a
// certificate. The credential picks the Graph cloud, e.g. US Government.
const graphApiBaseUrl = t.str().default(GRAPH);

export const microsoftTeams = defineNode({
	id: 'microsoftTeams',
	displayName: 'Microsoft Teams',
	// The scopes are delegated Graph permissions, as the Teams credential asks for them.
	// App-only Graph cannot post as a user, so the Service Principal type is not here.
	credential: credential({
		types: [
			microsoftTeamsOAuth2,
			compat('microsoftOAuth2Api', {
				id: 'microsoft.oauth2',
				fields: { graphApiBaseUrl },
				baseUrl: '{graphApiBaseUrl}',
			}),
		],
		scopes: {
			'Group.ReadWrite.All': 'Post channel messages, and list teams and channels',
			'Chat.ReadWrite': 'Post chat messages, and list chats',
		},
	}),
	baseUrl: GRAPH,
});

/** The IDs go into the request path, so a slash, `?`, `#` or a percent-encoding must not pass. */
const THREAD_ID = '^[0-9]+:[^/\\\\?#%\\s]+$';

export const teamsTeam = defineResource({
	id: 'microsoftTeams.team',
	label: 'Team',
	shape: {
		pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
		'x-n8n-hint': 'Team ID (the groupId in a team link), a GUID',
		examples: ['61165b04-e4cc-4026-b43f-926b4e2a7182'],
	},
	list: {
		request: { path: '/v1.0/me/joinedTeams' },
		response: t.obj({ value: t.arr(t.obj({ id: t.str(), displayName: t.str() })) }),
		items: 'value',
		item: { id: '{id}', label: '{displayName}' },
		search: 'label',
	},
});

const team = { teamId: ref(teamsTeam).title('Team') };

export const teamsChannel = defineResource({
	id: 'microsoftTeams.channel',
	label: 'Channel',
	shape: {
		pattern: THREAD_ID,
		'x-n8n-hint': 'Channel ID, not the name, e.g. 19:abc…@thread.tacv2',
		examples: ['19:-xlxyqXNSCxpI1SDzgQ_L9ZvzSR26pgphq1BJ9y7QJE1@thread.tacv2'],
	},
	input: team,
	list: {
		request: { path: '/v1.0/teams/{teamId}/channels' },
		response: t.obj({
			value: t.arr(t.obj({ id: t.str(), displayName: t.str(), webUrl: t.str().optional() })),
		}),
		items: 'value',
		item: { id: '{id}', label: '{displayName}', url: '{webUrl}' },
		search: 'label',
	},
});

export const teamsChat = defineResource({
	id: 'microsoftTeams.chat',
	label: 'Chat',
	shape: {
		pattern: THREAD_ID,
		'x-n8n-hint': 'Chat ID, e.g. 19:abc…@thread.v2 or 19:…@unq.gbl.spaces',
		examples: ['19:ebed9ad42c904d6c83adf0db360053ec@thread.v2'],
	},
	list: {
		// One page of the newest chats, as the legacy list shows them. A 1:1 chat has no topic,
		// so its label is its ID.
		request: { path: '/v1.0/chats', query: { $top: 50 } },
		response: t.obj({
			value: t.arr(
				t.obj({
					id: t.str(),
					topic: t.nullable(t.str()).optional(),
					webUrl: t.str().optional(),
				}),
			),
		}),
		items: 'value',
		item: { id: '{id}', label: '{topic}', url: '{webUrl}' },
		search: 'label',
	},
});

export const channelMessage = microsoftTeams.resource('channelMessage', {
	input: { ...team, channelId: ref(teamsChannel).title('Channel') },
});

export const chatMessage = microsoftTeams.resource('chatMessage', {
	input: { chatId: ref(teamsChat).title('Chat') },
});

const ATTRIBUTION =
	'<br><br><em> Powered by <a href="https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.microsoftTeams">n8n</a> </em>';

/** The content fields of a channel or chat message. */
export const content = {
	message: t.str().with({ minLength: 1 }).title('Message'),
	contentType: t
		.oneOf('text', 'html')
		.default('text')
		.title('Content Type')
		.hint('html for formatting, links or images'),
	appendAttribution: t
		.bool()
		.default(true)
		.title('Include Link to Workflow')
		.hint('Adds a "Powered by n8n" line and sends the message as html'),
};

/** Mirrors `prepareMessage` without mentions: the line makes the message html, as in the legacy node. */
export function messageBodyOf(input: {
	readonly message: string;
	readonly contentType: 'text' | 'html';
	readonly appendAttribution: boolean;
}) {
	const { message, contentType, appendAttribution } = input;
	return {
		body: appendAttribution
			? { contentType: 'html', content: `${message}${ATTRIBUTION}` }
			: { contentType, content: message },
	};
}

const identity = t.obj({ id: t.str(), displayName: t.nullable(t.str()) }).with({
	additionalProperties: true,
});

/** A message as Graph returns it. Graph may leave out any field. */
export const teamsMessage = t.loose(
	t
		.obj({
			id: t.str().hint('Message ID; use it as replyToId to reply in its thread'),
			replyToId: t.nullable(t.str()).hint('ID of the thread parent; null on a parent'),
			messageType: t.str(),
			createdDateTime: t.str(),
			webUrl: t.nullable(t.str()).hint('Link that opens the message in Teams'),
			chatId: t.nullable(t.str()).hint('Set for a chat message'),
			channelIdentity: t.nullable(t.obj({ teamId: t.str(), channelId: t.str() })),
			from: t.nullable(
				t.obj({ user: t.nullable(identity), application: t.nullable(identity) }).with({
					additionalProperties: true,
				}),
			),
			body: t.obj({ contentType: t.str(), content: t.str() }),
		})
		.with({ additionalProperties: true }),
);

/** A Graph error body. */
const graphError = t
	.obj({
		error: t.obj({ code: t.str(), message: t.str() }).with({ additionalProperties: true }),
	})
	.with({ additionalProperties: true });

/**
 * Graph puts the reason in `error.message`. The `HttpError` stays, so the host can classify the
 * failure by its status.
 */
export async function postMessage(http: Http, requestPath: EncodedPath, body: unknown) {
	try {
		return parse(teamsMessage, await http.request({ method: 'POST', path: requestPath, body }));
	} catch (error) {
		if (!isHttpError(error) || !matches(graphError, error.body)) throw error;
		error.message = `Microsoft Teams refused the message: ${error.body.error.message}`;
		throw error;
	}
}
