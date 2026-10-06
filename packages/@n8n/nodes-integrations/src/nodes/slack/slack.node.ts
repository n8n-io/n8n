import {
	defineNode,
	defineResource,
	limitOf,
	pages,
	parse,
	t,
	type AnySchema,
	type EncodedPath,
	type Http,
	type HttpRequest,
	type Infer,
	type Loose,
	type paging,
	type Shape,
} from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

export const slackToken = defineCredential({
	id: 'slack.token',
	legacyName: 'slackApi',
	displayName: 'Slack API',
	docs: 'slack',
	fields: {
		accessToken: field
			.secret('Access Token')
			.describe(
				'In your Slack app, open OAuth & Permissions. Copy the Bot User OAuth Token (xoxb-) or User OAuth Token (xoxp-), depending on the operations you need.',
			),
		signatureSecret: field
			.secret('Signature Secret')
			.optional()
			.describe(
				'The signature secret is used to verify the authenticity of requests sent by Slack.',
			),
		// n8n sets these when it builds a managed Slack app, e.g. for an Agent.
		managedAppId: field.hidden('Managed App ID'),
		teamId: field.hidden('Slack Team ID'),
		managerCredentialId: field.hidden('Manager Credential ID'),
		agentId: field.hidden('Agent ID'),
	},
	baseUrl: 'https://slack.com/api',
	// `files.slack.com` takes the bytes of a file upload.
	hosts: ['slack.com', 'files.slack.com'],
	auth: (a) => a.bearer('accessToken'),
	// Slack answers 200 with `ok: false` to a bad token.
	test: {
		get: '/users.profile.get',
		failWhen: [{ body: { error: 'invalid_auth' }, message: 'Invalid access token' }],
	},
	notice: {
		text: 'We strongly recommend setting up a <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#verify-the-webhook" target="_blank">signing secret</a> to ensure the authenticity of requests.',
		when: { signatureSecret: '' },
	},
});

export const slack = defineNode({
	id: 'slack',
	displayName: 'Slack',
	// Only the token credential: `slackOAuth2Api` signs with the user token at
	// `authed_user.access_token`, and an OAuth2 type cannot name that token path yet.
	credential: credential({
		types: [slackToken],
		scopes: {
			'chat:write': 'Send, update and delete messages as the app',
			'channels:history': 'Read messages in public channels',
			'groups:history': 'Read messages in private channels',
			'im:history': 'Read messages in direct messages',
			'mpim:history': 'Read messages in group direct messages',
			'channels:read': 'Read public channel details',
			'groups:read': 'Read private channel details',
			'im:read': 'Read direct message details',
			'mpim:read': 'Read group direct message details',
			'channels:manage': 'Create public channels',
			'groups:write': 'Create private channels',
			'reactions:write': 'Add emoji reactions',
			'users:read': 'Read users',
			'users:read.email': 'Find users by email address',
			'files:write': 'Upload files',
		},
	}),
	baseUrl: 'https://slack.com/api',
	// Slack answers 200 with `ok: false` for most errors.
	errorOf: (body) => {
		const status = parse(slackStatus, body);
		return status.ok === false ? slackErrorOf(status) : undefined;
	},
});

// Slack recommends at most 200 entries per page.
const PAGE_SIZE = 200;

/** The cursor fields of a Slack list method. */
const nextCursor = t.obj({ next_cursor: t.str().optional() }).optional();

/** The channels the token can see, as the legacy channel list shows them. */
const channelList = {
	request: {
		path: '/conversations.list',
		query: { types: 'public_channel,private_channel', exclude_archived: true },
	},
	response: t.obj({
		channels: t.arr(t.obj({ id: t.str(), name: t.str() })),
		response_metadata: nextCursor,
	}),
	items: 'channels',
	item: { id: '{id}', label: '#{name}' },
	pages: {
		style: 'cursor',
		next: 'response_metadata.next_cursor',
		send: { query: 'cursor' },
		size: { query: 'limit', max: PAGE_SIZE },
	},
	// conversations.list has no name filter.
	search: 'label',
} as const;

/** chat.postMessage takes a conversation ID, a user ID for a DM, or a channel name. */
export const slackConversation = defineResource({
	id: 'slack.conversation',
	label: 'Conversation',
	shape: {
		pattern: '^(?:[CGDUW][A-Z0-9]{2,}|#?[a-z0-9_-]{1,80})$',
		'x-n8n-hint': 'Channel ID (C…), #channel-name, or a user ID (U…) for a DM',
		examples: ['#general'],
	},
	list: channelList,
});

/** Methods other than chat.postMessage take a conversation ID only. */
export const slackChannelId = defineResource({
	id: 'slack.channel',
	label: 'Channel',
	shape: {
		pattern: '^[CGD][A-Z0-9]{2,}$',
		'x-n8n-hint': 'Channel ID such as C0123ABCDEF, not a #name; channel.getAll lists IDs',
		examples: ['C0123ABCDEF'],
	},
	list: channelList,
});

/** A user of the workspace. */
export const slackUserId = defineResource({
	id: 'slack.user',
	label: 'User',
	shape: { pattern: '^[UW][A-Z0-9]{2,}$', 'x-n8n-hint': 'User ID, e.g. U0123ABCDEF' },
	list: {
		request: { path: '/users.list' },
		response: t.obj({
			members: t.arr(t.obj({ id: t.str(), name: t.str() })),
			response_metadata: nextCursor,
		}),
		items: 'members',
		item: { id: '{id}', label: '@{name}' },
		pages: {
			style: 'cursor',
			next: 'response_metadata.next_cursor',
			send: { query: 'cursor' },
			size: { query: 'limit', max: PAGE_SIZE },
		},
		search: 'label',
	},
});

export const slackTs = t
	.str()
	.with({ pattern: '^[0-9]+\\.[0-9]+$' })
	.hint('Message ts as a string, e.g. 1700000000.000100');

export const message = slack.resource('message');
export const channel = slack.resource('channel');
export const reaction = slack.resource('reaction');
export const user = slack.resource('user');
export const file = slack.resource('file');

const ATTRIBUTION =
	'_Automated with <https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack|n8n>_';

const block = t.obj({ type: t.str() }).with({
	additionalProperties: true,
	'x-n8n-hint': 'A Block Kit block, e.g. { type: "section", text: { type: "mrkdwn", text } }',
});

/** The content fields of chat.postMessage and chat.update. */
export const content = {
	text: t
		.str()
		.with({ minLength: 1 })
		.hint('Slack mrkdwn, e.g. *bold* and <https://x.io|link>; the fallback for blocks'),
	blocks: t.arr(block).hint('Block Kit layout; text is then the notification text').optional(),
	appendAttribution: t.bool().default(true).hint('Adds an "Automated with n8n" line'),
};

/** Mirrors `getMessageContent`: the line goes into the blocks when there are blocks. */
export function contentOf(input: {
	readonly text: string;
	readonly blocks?: ReadonlyArray<Infer<typeof block>>;
	readonly appendAttribution: boolean;
}) {
	const { text, blocks, appendAttribution } = input;
	if (!blocks) return { text: appendAttribution ? `${text}\n${ATTRIBUTION}` : text };
	const line = { type: 'section', text: { type: 'mrkdwn', text: ATTRIBUTION } };
	return { text, blocks: appendAttribution ? [...blocks, line] : blocks };
}

// Slack may leave out any field, so the API objects are loose: each field optional and nullable.

/** A message as Slack returns it. Bots, files and threads add fields. */
export const slackMessage = t.loose(
	t
		.obj({
			type: t.str(),
			ts: t.str().hint('Message ID within its channel, e.g. 1700000000.000100'),
			text: t.str().optional(),
			user: t.str().hint('User ID of the author; absent for bot messages').optional(),
			bot_id: t.str().optional(),
			subtype: t.str().optional(),
			thread_ts: t.str().hint('ts of the thread parent; equals ts on the parent').optional(),
			reply_count: t.int().optional(),
		})
		.with({ additionalProperties: true }),
);

const topic = t.obj({ value: t.str() }).with({ additionalProperties: true });

/** A conversation as Slack returns it. A DM has `user` instead of `name`. */
export const slackChannel = t.loose(
	t
		.obj({
			id: t.str(),
			name: t.str().hint('Without the #; absent for a DM').optional(),
			is_channel: t.bool().optional(),
			is_private: t.bool().optional(),
			is_archived: t.bool().optional(),
			is_member: t.bool().hint('The app is in the channel, so it can post and read').optional(),
			created: t.int().hint('Epoch seconds').optional(),
			creator: t.str().optional(),
			topic: topic.optional(),
			purpose: topic.optional(),
			num_members: t.int().optional(),
		})
		.with({ additionalProperties: true }),
);

/** A user as users.info returns it. */
export const slackUser = t.loose(
	t
		.obj({
			id: t.str(),
			name: t.str().hint('The handle, without the @'),
			real_name: t.str().optional(),
			deleted: t.bool().optional(),
			is_bot: t.bool().optional(),
			tz: t.str().optional(),
			profile: t
				.obj({
					email: t.str().hint('Needs the users:read.email scope').optional(),
					display_name: t.str().optional(),
					real_name: t.str().optional(),
				})
				.with({ additionalProperties: true })
				.optional(),
		})
		.with({ additionalProperties: true }),
);

/** The status fields of every Slack Web API body. */
const slackStatus = t
	.obj({
		ok: t.bool(),
		error: t.str().optional(),
		needed: t.str().hint('The missing scopes of a missing_scope error').optional(),
	})
	.with({ additionalProperties: true });

/** Mirrors `throwOnSlackApiError` in nodes-base Slack/V2/GenericFunctions.ts. */
function slackErrorOf({ error, needed }: Loose<Infer<typeof slackStatus>>) {
	switch (error) {
		case 'missing_scope':
			return `Your Slack credential is missing required OAuth scopes: ${String(needed)}`;
		case 'not_in_channel':
			return 'The Slack app is not in this channel. Invite it with /invite, then run again.';
		case 'ratelimited':
		case 'rate_limited':
			return `Slack error response: ${JSON.stringify(error)}. Wait before you run this again.`;
		case 'paid_teams_only':
			return 'Your current Slack plan does not include this method';
		case 'not_admin':
			return 'Need higher Role Level for this Operation (e.g. Owner or Admin Rights)';
		default:
			return `Slack error response: ${JSON.stringify(error)}`;
	}
}

/** A Slack body with these fields next to `ok`; Slack adds fields such as `warning`. */
export const slackResponse = <S extends Shape>(shape: S) =>
	t.loose(t.obj(shape).with({ additionalProperties: true }));

// Without the charset, Slack adds a `missing_charset` warning to each response.
const JSON_UTF8 = { 'content-type': 'application/json; charset=utf-8' };

export async function slackPost<S extends AnySchema>(
	http: Http,
	path: EncodedPath,
	body: unknown,
	response: S,
) {
	const request: HttpRequest = { method: 'POST', path, headers: JSON_UTF8, body };
	return parse(response, await http.request(request));
}

/** One page of a cursor list method; Slack sends an empty cursor on the last page. */
const cursorPage = slackResponse({
	response_metadata: t
		.obj({ next_cursor: t.str().optional() })
		.with({ additionalProperties: true })
		.optional(),
});

/** The entries of a cursor list method, page by page, up to the paging limit. */
export function slackList<S extends AnySchema, T>(
	http: Http,
	list: {
		readonly path: EncodedPath;
		readonly query: HttpRequest['query'];
		readonly page: S;
		readonly items: (page: Loose<Infer<S>>) => readonly T[];
		readonly paging: Infer<typeof paging>;
	},
) {
	return pages(http, {
		page: (body) => ({ entries: parse(list.page, body), cursor: parse(cursorPage, body) }),
		request: (cursor, room) => ({
			path: list.path,
			query: { ...list.query, limit: Math.min(room ?? PAGE_SIZE, PAGE_SIZE), cursor },
		}),
		items: ({ entries }) => list.items(entries),
		next: ({ cursor }) => cursor.response_metadata?.next_cursor,
		limit: limitOf(list.paging),
	});
}
