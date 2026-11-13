/**
 * Compiled library node: a hand port of `n8n-nodes-base.slack` versions 2 to
 * 2.7, operation `message.post` (chat.postMessage) with an access token.
 *
 * It takes the v1 parameters: a channel or a user, a text or a block message,
 * and the other options that v1 copies into the request body. The output is
 * the Slack response with `ts` renamed to `message_timestamp`, as in v1.
 *
 * The link to the workflow (from version 2.1 on by default) needs the URL and
 * the id of the n8n instance: the converter passes them in `workflowLink`
 * when it knows them (`ConvertOptions.instance`), and else sends the call to
 * the fallback host. With OAuth2, the credentials file signs with the token
 * that v1 uses (`deriveInject`).
 *
 * Not supported: ephemeral messages, attachments and channels in mode `url`.
 * The converter sends these calls to the fallback host. Hand-written
 * workflows can also pass `channel` and `threadTs`.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: unknown;
}

interface SlackOtherOptions {
	includeLinkToWorkflow?: boolean;
	thread_ts?: { replyValues?: { thread_ts?: unknown; reply_broadcast?: unknown } };
	botProfile?: {
		imageValues?: { profilePhotoType?: string; icon_url?: string; icon_emoji?: string };
	};
	sendAsUser?: string;
	[key: string]: unknown;
}

interface SlackParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	select?: string;
	channelId?: string | Locator;
	user?: string | Locator;
	messageType?: string;
	text?: string;
	blocksUi?: unknown;
	otherOptions?: SlackOtherOptions;
	channel?: string;
	threadTs?: string;
	workflowLink?: { baseUrl?: string; workflowId?: string; instanceId?: string };
	timestamp?: unknown;
	name?: string;
	returnAll?: boolean;
	limit?: number;
	filters?: { inclusive?: boolean; latest?: string; oldest?: string };
	sortHistory?: boolean;
}

interface SlackResponse {
	ok?: boolean;
	error?: string;
	ts?: unknown;
	[key: string]: unknown;
}

/** String(value) of JavaScript for JSON values. */
function asText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (Array.isArray(value)) {
		return value.map((v) => (v === null || v === undefined ? '' : asText(v))).join(',');
	}
	return '[object Object]';
}

/** The value of a resource locator, as `extractValue` gives it for modes other than `url`. */
function locatorValue(value: string | Locator | undefined): string {
	if (value === undefined) return '';
	if (typeof value === 'string') return value;
	return asText(value.value ?? '');
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The message of throwOnSlackApiError of the v1 node. */
function slackError(error: unknown): string {
	if (error === 'paid_teams_only') {
		return "Your current Slack plan does not include the resource 'message'";
	}
	if (error === 'ratelimited' || error === 'rate_limited') {
		return `Slack error response: ${JSON.stringify(error)}`;
	}
	if (error === 'missing_scope') return 'Your Slack credential is missing required Oauth Scopes';
	if (error === 'not_allowed_token_type' || error === 'invalid_action_token') {
		return 'This Slack operation requires a user token';
	}
	if (error === 'not_admin') {
		return 'Need higher Role Level for this Operation (e.g. Owner or Admin Rights)';
	}
	return `Slack error response: ${JSON.stringify(error)}`;
}

/** The body of a block message: `blocksUi` as an object (v1 parses a JSON string). */
function blockContent(value: unknown): Record<string, unknown> {
	if (isObject(value)) {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value)) out[key] = value[key];
		return out;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed: unknown = JSON.parse(value);
		if (isObject(parsed)) return parsed;
		// `ensureType: 'object'` also accepts an array, and v1 spreads it into the body:
		// its elements go out under the keys "0", "1", …
		if (Array.isArray(parsed)) {
			const out: Record<string, unknown> = {};
			for (let k = 0; k < parsed.length; k++) out[String(k)] = parsed[k];
			return out;
		}
	}
	if (Array.isArray(value)) {
		const out: Record<string, unknown> = {};
		for (let k = 0; k < value.length; k++) out[String(k)] = value[k];
		return out;
	}
	if (value === undefined || value === '') return {};
	throw new Error("The parameter 'blocksUi' must be an object");
}

export default defineNode<SlackParameters>({
	type: 'n8n-nodes-base.slack',
	version: 2,
	supports: {
		resource: 'message',
		operation: { message: 'post' },
		operations: {
			'reaction.add': ['authentication="accessToken"|"oAuth2"', 'channelId', 'timestamp', 'name'],
			'channel.history': [
				'authentication="accessToken"|"oAuth2"',
				'channelId',
				'returnAll',
				'limit',
				'filters',
				'filters.inclusive',
				'filters.latest',
				'filters.oldest',
				'sortHistory',
			],
			'message.post': [
				'authentication="accessToken"|"oAuth2"',
				'select="channel"|"user"',
				'channelId',
				'user',
				'messageType="text"|"block"',
				'text',
				'blocksUi',
				'otherOptions',
				'otherOptions.includeLinkToWorkflow',
				'otherOptions.thread_ts',
				'otherOptions.botProfile',
				'otherOptions.mrkdwn',
				'otherOptions.unfurl_links',
				'otherOptions.unfurl_media',
				'otherOptions.link_names',
				'otherOptions.sendAsUser',
				'channel',
				'threadTs',
				'workflowLink',
				'workflowLink.baseUrl',
				'workflowLink.workflowId',
				'workflowLink.instanceId',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'message';
		const operation = parameters.operation ?? 'post';
		// slackApiRequest of the v1 node: a JSON request; `ok: false` fails.
		const slack = async (
			method: string,
			path: string,
			qs: Record<string, unknown>,
			body: unknown,
		) => {
			const response = await ctx.http<SlackResponse>({
				method,
				url: `https://slack.com/api${path}`,
				headers: { 'content-type': 'application/json; charset=utf-8' },
				qs,
				body,
				credential,
			});
			if (response.body.ok === false) throw new Error(slackError(response.body.error));
			return response.body;
		};
		if (resource === 'reaction' && operation === 'add') {
			const out: Item[] = [];
			for (const _item of items ?? [{}]) {
				const body = {
					channel: locatorValue(parameters.channelId),
					name: parameters.name ?? '',
					timestamp: asText(parameters.timestamp),
				};
				const data = await slack('POST', '/reactions.add', {}, body);
				const result: Item = {};
				for (const key of Object.keys(data)) if (key !== 'ts') result[key] = data[key];
				if (data.ts !== undefined) result.message_timestamp = data.ts;
				out.push(result);
			}
			return out;
		}
		if (resource === 'channel' && operation === 'history') {
			const out: Item[] = [];
			for (const _item of items ?? [{}]) {
				const filters = parameters.filters ?? {};
				const qs: Record<string, unknown> = { channel: locatorValue(parameters.channelId) };
				if (filters.inclusive) qs.inclusive = filters.inclusive;
				if (filters.latest) qs.latest = new Date(filters.latest).getTime() / 1000;
				if (filters.oldest) qs.oldest = new Date(filters.oldest).getTime() / 1000;
				let messages: Item[] = [];
				if (parameters.returnAll === true) {
					// slackApiRequestAllItems of the v1 node: pages of 100 while a cursor is left.
					qs.page = 1;
					qs.limit = 100;
					for (;;) {
						const data = await slack('GET', '/conversations.history', { ...qs }, undefined);
						const metadata = data.response_metadata;
						const cursor = isObject(metadata) ? metadata.next_cursor : undefined;
						qs.cursor = cursor;
						qs.page = Number(qs.page) + 1;
						const list = data.messages;
						if (Array.isArray(list)) for (const m of list) if (isObject(m)) messages.push(m);
						if (cursor === undefined || cursor === null || cursor === '') break;
					}
				} else {
					qs.limit = parameters.limit ?? 50;
					const data = await slack('GET', '/conversations.history', qs, undefined);
					const list = data.messages;
					messages = Array.isArray(list) ? list.filter(isObject) : [];
				}
				// From version 2.4, v1 sorts the messages by `ts`, newest first.
				if (parameters.sortHistory === true) {
					messages.sort((a, b) => Number(b.ts ?? 0) - Number(a.ts ?? 0));
				}
				for (const m of messages) out.push(m);
			}
			return out;
		}
		if (resource !== 'message' || operation !== 'post') {
			throw new Error(`Slack: ${resource}.${operation} is not in the compiled library`);
		}
		const authentication = parameters.authentication ?? 'accessToken';
		// getTarget of the v1 node.
		let target = '';
		if (parameters.channel !== undefined) {
			target = asText(parameters.channel);
		} else if ((parameters.select ?? 'channel') === 'user') {
			const user = parameters.user;
			target = locatorValue(user);
			const byName = typeof user === 'object' && user.mode === 'username';
			if (byName && !target.startsWith('@')) target = `@${target}`;
		} else {
			target = locatorValue(parameters.channelId);
		}
		// getMessageContent of the v1 node.
		const link = parameters.workflowLink;
		const instanceId = link?.instanceId ? `_${link.instanceId}` : '';
		const automated = link
			? `_Automated with this <${link.baseUrl ?? ''}workflow/${link.workflowId ?? ''}?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack${instanceId}|n8n workflow>_`
			: '';
		let content: Record<string, unknown> = {};
		const text = parameters.text ?? '';
		if ((parameters.messageType ?? 'text') === 'block') {
			content = blockContent(parameters.blocksUi);
			const blocks = content.blocks;
			if (link && Array.isArray(blocks)) {
				blocks.push({ type: 'section', text: { type: 'mrkdwn', text: automated } });
			}
			if (text) content.text = text;
		} else {
			content = { text: link ? `${text}\n${automated}` : text };
		}
		const body: Record<string, unknown> = { channel: target };
		for (const key of Object.keys(content)) body[key] = content[key];
		const other: SlackOtherOptions = parameters.otherOptions ?? {};
		const sendAsUser = other.sendAsUser;
		if (authentication === 'accessToken' && sendAsUser !== '' && sendAsUser !== undefined) {
			body.username = sendAsUser;
		}
		// processThreadOptions of the v1 node.
		const reply = other.thread_ts?.replyValues;
		if (reply?.thread_ts) body.thread_ts = asText(reply.thread_ts);
		if (reply?.reply_broadcast !== undefined) body.reply_broadcast = reply.reply_broadcast;
		if (parameters.threadTs !== undefined) body.thread_ts = asText(parameters.threadTs);
		const profile = other.botProfile?.imageValues;
		if (other.botProfile) {
			if (profile?.profilePhotoType === 'image') body.icon_url = profile.icon_url;
			else body.icon_emoji = profile?.icon_emoji;
		}
		// v1 copies the other options that are left into the body.
		for (const key of Object.keys(other)) {
			if (key === 'thread_ts' || key === 'ephemeral' || key === 'botProfile') continue;
			body[key] = other[key];
		}
		// v1 posts once for each input item.
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			const response = await ctx.http<SlackResponse>({
				method: 'POST',
				url: 'https://slack.com/api/chat.postMessage',
				headers: { 'content-type': 'application/json; charset=utf-8' },
				qs: {},
				body,
				credential,
			});
			const data = response.body;
			if (data.ok === false) throw new Error(slackError(data.error));
			const result: Item = {};
			for (const key of Object.keys(data)) if (key !== 'ts') result[key] = data[key];
			if (data.ts !== undefined) result.message_timestamp = data.ts;
			out.push(result);
		}
		return out;
	},
});
