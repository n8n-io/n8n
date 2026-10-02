import {
	arr,
	bool,
	credential,
	credentialType,
	defineNode,
	defineResource,
	int,
	limitOf,
	obj,
	pages,
	type paging,
	parse,
	str,
	t,
	type AnySchema,
	type Http,
	type HttpRequest,
	type Infer,
	type Shape,
} from '@n8n/node-sdk';

export const slackToken = credentialType({
	id: 'slack.token',
	legacyName: 'slackApi',
	displayName: 'Slack API',
	docs: 'slack',
	fields: {
		accessToken: t
			.secret('Access Token')
			.describe(
				'In your Slack app, open OAuth & Permissions. Copy the Bot User OAuth Token (xoxb-) or User OAuth Token (xoxp-), depending on the operations you need.',
			),
		signatureSecret: t
			.secret('Signature Secret')
			.optional()
			.describe(
				'The signature secret is used to verify the authenticity of requests sent by Slack.',
			),
		// n8n sets these when it builds a managed Slack app, e.g. for an Agent.
		managedAppId: t.hidden('Managed App ID'),
		teamId: t.hidden('Slack Team ID'),
		managerCredentialId: t.hidden('Manager Credential ID'),
		agentId: t.hidden('Agent ID'),
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
});

/** chat.postMessage takes a conversation ID, a user ID for a DM, or a channel name. */
export const slackConversation = defineResource({
	id: 'slack.conversation',
	label: 'Conversation',
	shape: {
		pattern: '^(?:[CGDUW][A-Z0-9]{2,}|#?[a-z0-9_-]{1,80})$',
		'x-n8n-hint': 'Channel ID (C…), #channel-name, or a user ID (U…) for a DM',
		examples: ['#general'],
	},
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
});

export const slackTs = str()
	.with({ pattern: '^[0-9]+\\.[0-9]+$' })
	.hint('Message ts as a string, e.g. 1700000000.000100');

export const message = slack.resource('message');
export const channel = slack.resource('channel');
export const reaction = slack.resource('reaction');
export const user = slack.resource('user');
export const file = slack.resource('file');

const ATTRIBUTION =
	'_Automated with <https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack|n8n>_';

const block = obj({ type: str() }).with({
	additionalProperties: true,
	'x-n8n-hint': 'A Block Kit block, e.g. { type: "section", text: { type: "mrkdwn", text } }',
});

/** The content fields of chat.postMessage and chat.update. */
export const content = {
	text: str()
		.with({ minLength: 1 })
		.hint('Slack mrkdwn, e.g. *bold* and <https://x.io|link>; the fallback for blocks'),
	blocks: arr(block).hint('Block Kit layout; text is then the notification text').optional(),
	appendAttribution: bool().default(true).hint('Adds an "Automated with n8n" line'),
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

/** A message as Slack returns it. Bots, files and threads add fields. */
export const slackMessage = obj({
	type: str(),
	ts: str().hint('Message ID within its channel, e.g. 1700000000.000100'),
	text: str().optional(),
	user: str().hint('User ID of the author; absent for bot messages').optional(),
	bot_id: str().optional(),
	subtype: str().optional(),
	thread_ts: str().hint('ts of the thread parent; equals ts on the parent').optional(),
	reply_count: int().optional(),
}).with({ additionalProperties: true });

const topic = obj({ value: str() }).with({ additionalProperties: true });

/** A conversation as Slack returns it. A DM has `user` instead of `name`. */
export const slackChannel = obj({
	id: str(),
	name: str().hint('Without the #; absent for a DM').optional(),
	is_channel: bool().optional(),
	is_private: bool().optional(),
	is_archived: bool().optional(),
	is_member: bool().hint('The app is in the channel, so it can post and read').optional(),
	created: int().hint('Epoch seconds').optional(),
	creator: str().optional(),
	topic: topic.optional(),
	purpose: topic.optional(),
	num_members: int().optional(),
}).with({ additionalProperties: true });

/** A user as users.info returns it. */
export const slackUser = obj({
	id: str(),
	name: str().hint('The handle, without the @'),
	real_name: str().optional(),
	deleted: bool().optional(),
	is_bot: bool().optional(),
	tz: str().optional(),
	profile: obj({
		email: str().hint('Needs the users:read.email scope').optional(),
		display_name: str().optional(),
		real_name: str().optional(),
	})
		.with({ additionalProperties: true })
		.optional(),
}).with({ additionalProperties: true });

/** The status fields of every Slack Web API body. */
const slackStatus = obj({
	ok: bool(),
	error: str().optional(),
	needed: str().hint('The missing scopes of a missing_scope error').optional(),
}).with({ additionalProperties: true });

/** Mirrors `throwOnSlackApiError` in nodes-base Slack/V2/GenericFunctions.ts. */
function slackErrorOf({ error, needed }: Infer<typeof slackStatus>) {
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
	obj(shape).with({ additionalProperties: true });

/** Slack answers 200 with `ok: false` for most errors, so each body needs this check first. */
export function okBody<S extends AnySchema>(body: unknown, response: S): Infer<S> {
	const status = parse(slackStatus, body);
	if (!status.ok) throw new Error(slackErrorOf(status));
	return parse(response, body);
}

// Without the charset, Slack adds a `missing_charset` warning to each response.
const JSON_UTF8 = { 'content-type': 'application/json; charset=utf-8' };

export async function slackPost<S extends AnySchema>(
	http: Http,
	path: `/${string}`,
	body: unknown,
	response: S,
) {
	const request: HttpRequest = { method: 'POST', path, headers: JSON_UTF8, body };
	return okBody(await http.request(request), response);
}

export async function slackGet<S extends AnySchema>(
	http: Http,
	path: `/${string}`,
	query: HttpRequest['query'],
	response: S,
) {
	return okBody(await http.request({ path, query }), response);
}

/** One page of a cursor list method; Slack sends an empty cursor on the last page. */
const cursorPage = slackResponse({
	response_metadata: obj({ next_cursor: str().optional() })
		.with({ additionalProperties: true })
		.optional(),
});

// Slack recommends at most 200 entries per page.
const PAGE_SIZE = 200;

/**
 * The entries of a cursor list method, page by page, up to the paging limit. Each page needs
 * the `ok` check first, so a declarative list cannot read it yet.
 */
export function slackList<S extends AnySchema, T>(
	http: Http,
	list: {
		readonly path: `/${string}`;
		readonly query: HttpRequest['query'];
		readonly page: S;
		readonly items: (page: Infer<S>) => readonly T[];
		readonly paging: Infer<typeof paging>;
	},
) {
	return pages(http, {
		page: (body) => ({ entries: okBody(body, list.page), cursor: parse(cursorPage, body) }),
		request: (cursor, room) => ({
			path: list.path,
			query: { ...list.query, limit: Math.min(room ?? PAGE_SIZE, PAGE_SIZE), cursor },
		}),
		items: ({ entries }) => list.items(entries),
		next: ({ cursor }) => cursor.response_metadata?.next_cursor,
		limit: limitOf(list.paging),
	});
}
