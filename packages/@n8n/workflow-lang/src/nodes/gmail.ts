/**
 * Compiled library node: a hand port of `n8n-nodes-base.gmail` version 2.2,
 * operations `message.send`, `message.getAll` and `message.get` with
 * `simple` on (the other mode parses the raw MIME message in the fallback
 * host), and `message.addLabels`, `removeLabels`, `markAsRead`,
 * `markAsUnread` and `delete`.
 *
 * The v1 node builds the MIME message with nodemailer. This port builds an
 * equal message in the subset: the same addresses, subject and body, with a
 * base64 body and RFC 2047 subject. The bytes differ (nodemailer also adds a
 * random Message-ID and a Date header; Gmail adds both when they are missing),
 * so the equivalence test compares the parsed messages.
 *
 * Limits: attachments, the service account authentication and
 * `replyToSenderOnly` are not supported. Address display names must be ASCII.
 * The attribution link has no instance id: a compiled workflow does not know
 * the n8n instance.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface GmailOptions {
	appendAttribution?: boolean;
	bccList?: string;
	ccList?: string;
	senderName?: string;
	replyTo?: string;
}

interface GmailFilters {
	includeSpamTrash?: boolean;
	labelIds?: string[] | string;
	q?: string;
	readStatus?: string;
	receivedAfter?: string | number;
	receivedBefore?: string | number;
	sender?: string;
}

interface GmailParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	messageId?: string;
	instanceId?: string;
	labelIds?: string[] | string;
	returnAll?: boolean;
	limit?: number;
	simple?: boolean;
	filters?: GmailFilters;
	sendTo?: string;
	subject?: string;
	emailType?: string;
	message?: string;
	options?: GmailOptions;
}

/** Base64 of the UTF-8 bytes of a string, with the native codec (spec section 4.3). */
function base64Utf8(text: string): string {
	return Base64.encodeUtf8(text);
}

/** Printable ASCII or tab. */
function isAscii(text: string): boolean {
	// The native check has no tab; tabs are rare, so only then copy the text.
	return Ascii.isPrintable(text.includes('\t') ? text.split('\t').join(' ') : text);
}

/** prepareEmailsInput of the v1 node, as a header value. */
function addresses(input: string, field: string): string {
	const out: string[] = [];
	for (const entry of String(input).split(',')) {
		const email = entry.trim();
		if (!email.includes('@')) {
			throw new Error(
				`Invalid email address: the email address '${email}' in the '${field}' field isn't valid`,
			);
		}
		if (!isAscii(email))
			throw new Error('Gmail: non-ASCII addresses are not in the compiled library');
		out.push(email.includes('<') && email.includes('>') ? email : `<${email}>`);
	}
	return out.join(', ');
}

/** prepareEmailBody of the v1 node. */
function emailBody(
	type: string,
	message: string,
	attribution: boolean,
	instanceId: string | undefined,
): string {
	if (!attribution) return message;
	const text = 'This email was sent automatically with ';
	if (type === 'html') {
		// createUtmCampaignLink of the v1 node: the instance id ends the link when it is known.
		const link = `https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.gmail${instanceId ? `_${instanceId}` : ''}`;
		return `\n\t\t\t${message}\n\t\t\t<br>\n\t\t\t<br>\n\t\t\t---\n\t\t\t<br>\n\t\t\t<em>${text}<a href="${link}" target="_blank">n8n</a></em>\n\t\t\t`;
	}
	return `${message}\n\n---\n${text}n8n\nhttps://n8n.io`;
}

/** prepareTimestamp of the v1 node: a date as Unix seconds in the query. */
function addTimestamp(query: string, value: string | number, label: string): string {
	let seconds = Math.round(Date.parse(String(value)) / 1000);
	if (isNaN(seconds) && String(value).length < 12) seconds = parseInt(String(value), 10);
	if (isNaN(seconds)) seconds = Math.floor(parseInt(String(value), 10) / 1000);
	if (isNaN(seconds) || seconds === 0) {
		throw new Error(
			`Invalid date/time in 'Received ${label.charAt(0).toUpperCase()}${label.slice(1)}' field`,
		);
	}
	return query ? `${query} ${label}:${seconds}` : `${label}:${seconds}`;
}

/** prepareQuery of the v1 node: the filters as the query of the message list. */
function listQuery(filters: GmailFilters): Record<string, unknown> {
	const qs: Record<string, unknown> = {};
	let q = filters.q ?? '';
	if (filters.includeSpamTrash !== undefined) qs.includeSpamTrash = filters.includeSpamTrash;
	if (filters.labelIds !== undefined) qs.labelIds = filters.labelIds;
	if (filters.sender) q = q ? `${q} from:${filters.sender}` : `from:${filters.sender}`;
	if (filters.readStatus && filters.readStatus !== 'both') {
		q = q ? `${q} is:${filters.readStatus}` : `is:${filters.readStatus}`;
	}
	if (filters.receivedAfter) q = addTimestamp(q, filters.receivedAfter, 'after');
	if (filters.receivedBefore) q = addTimestamp(q, filters.receivedBefore, 'before');
	if (q !== '' || filters.q !== undefined) qs.q = q;
	return qs;
}

interface GmailMessage {
	id?: string;
	labelIds?: string[];
	payload?: { headers?: Array<{ name: string; value: string }> } & Record<string, unknown>;
	[key: string]: unknown;
}

/** simplifyOutput of the v1 node: label names, and the headers as fields. */
function simplify(message: GmailMessage, labels: Array<{ id: string; name: string }>): Item {
	// v1 changes the message in place: the key order stays, `labels` and the
	// headers come last.
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(message)) {
		if (key === 'labelIds') continue;
		if (key === 'payload' && message.payload) {
			const payload: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(message.payload)) if (k !== 'headers') payload[k] = v;
			out.payload = payload;
			continue;
		}
		out[key] = value;
	}
	if (message.labelIds) {
		const ids = message.labelIds;
		out.labels = labels.filter((label) => ids.includes(label.id));
	}
	for (const header of message.payload?.headers ?? []) out[header.name] = header.value;
	return out;
}

function wrap(text: string, width: number): string {
	const lines: string[] = [];
	for (let i = 0; i < text.length; i += width) lines.push(text.slice(i, i + width));
	return lines.join('\r\n');
}

export default defineNode<GmailParameters>({
	type: 'n8n-nodes-base.gmail',
	version: 2.2,
	supports: {
		resource: 'message',
		operation: { message: 'send' },
		operations: {
			'message.getAll': [
				'authentication',
				'returnAll',
				'limit',
				'simple=true',
				'filters',
				'filters.includeSpamTrash',
				'filters.labelIds',
				'filters.q',
				'filters.readStatus',
				'filters.receivedAfter',
				'filters.receivedBefore',
				'filters.sender',
				'options',
			],
			'message.get': ['authentication', 'messageId', 'simple=true', 'options'],
			'message.addLabels': ['authentication', 'messageId', 'labelIds'],
			'message.removeLabels': ['authentication', 'messageId', 'labelIds'],
			'message.markAsRead': ['authentication', 'messageId'],
			'message.markAsUnread': ['authentication', 'messageId'],
			'message.delete': ['authentication', 'messageId'],
			'message.send': [
				'authentication',
				'sendTo',
				'subject',
				'emailType',
				'message',
				'options',
				'options.appendAttribution',
				'instanceId',
				'options.bccList',
				'options.ccList',
				'options.senderName',
				'options.replyTo',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'message';
		const operation = parameters.operation ?? 'send';
		const modify = ['addLabels', 'removeLabels', 'markAsRead', 'markAsUnread'];
		const known = ['send', 'get', 'getAll', 'delete'].concat(modify);
		if (resource !== 'message' || !known.includes(operation)) {
			throw new Error(`Gmail: ${resource}.${operation} is not in the compiled library`);
		}
		if ((parameters.authentication ?? 'oAuth2') !== 'oAuth2') {
			throw new Error('Gmail: only OAuth2 authentication is in the compiled library');
		}
		const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
		const api = 'https://www.googleapis.com/gmail/v1/users/me';
		const get = async <T>(url: string, qs: Record<string, unknown>): Promise<T> => {
			const response = await ctx.http<T>({
				method: 'GET',
				url,
				headers,
				qs,
				body: undefined,
				credential,
			});
			if (response.status >= 400) throw new Error(`Gmail: HTTP status ${response.status}`);
			return response.body;
		};
		const metadata = {
			format: 'metadata',
			metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
		};
		const labelList = async () => {
			const data = await get<{ labels?: Array<{ id: string; name: string }> }>(`${api}/labels`, {});
			return (data.labels ?? []).map((label) => ({ id: label.id, name: label.name }));
		};
		if (modify.includes(operation) || operation === 'delete') {
			const out: Item[] = [];
			for (const _item of items ?? [{}]) {
				const url = `${api}/messages/${String(parameters.messageId ?? '')}`;
				if (operation === 'delete') {
					const response = await ctx.http<unknown>({
						method: 'DELETE',
						url,
						headers,
						qs: {},
						body: undefined,
						credential,
					});
					if (response.status >= 400) throw new Error(`Gmail: HTTP status ${response.status}`);
					out.push({ success: true });
					continue;
				}
				// users.messages.modify: the label changes of each operation.
				let body: Record<string, unknown> = { removeLabelIds: ['UNREAD'] };
				if (operation === 'markAsUnread') body = { addLabelIds: ['UNREAD'] };
				if (operation === 'addLabels') body = { addLabelIds: parameters.labelIds };
				if (operation === 'removeLabels') body = { removeLabelIds: parameters.labelIds };
				const response = await ctx.http<Item>({
					method: 'POST',
					url: `${url}/modify`,
					headers,
					qs: {},
					body,
					credential,
				});
				if (response.status >= 400) throw new Error(`Gmail: HTTP status ${response.status}`);
				out.push(response.body);
			}
			return out;
		}
		if (operation === 'get') {
			const out: Item[] = [];
			for (const _item of items ?? [{}]) {
				const message = await get<GmailMessage>(
					`${api}/messages/${String(parameters.messageId ?? '')}`,
					metadata,
				);
				out.push(simplify(message, await labelList()));
			}
			return out;
		}
		if (operation === 'getAll') {
			const out: Item[] = [];
			for (const _item of items ?? [{}]) {
				const qs = listQuery(parameters.filters ?? {});
				let list: Array<{ id: string }> = [];
				if (parameters.returnAll === true) {
					// googleApiRequestAllItems: pages of 100 until no page token is left.
					qs.maxResults = 100;
					let token: string | undefined;
					for (let page = 0; page < 10000; page++) {
						if (token !== undefined) qs.pageToken = token;
						const data = await get<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(
							`${api}/messages`,
							qs,
						);
						list = list.concat(data.messages ?? []);
						if (data.nextPageToken === undefined || data.nextPageToken === '') {
							// v1 sets the token on the shared query to the missing value.
							delete qs.pageToken;
							break;
						}
						token = data.nextPageToken;
					}
				} else {
					qs.maxResults = parameters.limit ?? 50;
					const data = await get<{ messages?: Array<{ id: string }> }>(`${api}/messages`, qs);
					list = data.messages ?? [];
				}
				// v1 reuses the list query for each message, with the metadata format added.
				const messageQs: Record<string, unknown> = { ...qs, ...metadata };
				const messages: GmailMessage[] = [];
				for (const entry of list) {
					messages.push(await get<GmailMessage>(`${api}/messages/${entry.id}`, messageQs));
				}
				const labels = await labelList();
				for (const message of messages) out.push(simplify(message, labels));
			}
			return out;
		}
		const options = parameters.options ?? {};
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			const lines: string[] = [];
			if (options.senderName) {
				const profile = await ctx.http<{ emailAddress?: string }>({
					method: 'GET',
					url: 'https://www.googleapis.com/gmail/v1/users/me/profile',
					headers,
					qs: {},
					body: undefined,
					credential,
				});
				if (profile.status >= 400) throw new Error(`Gmail: HTTP status ${profile.status}`);
				lines.push(`From: ${options.senderName} <${String(profile.body.emailAddress)}>`);
			}
			lines.push(`To: ${addresses(parameters.sendTo ?? '', 'To')}`);
			if (options.ccList) lines.push(`Cc: ${addresses(options.ccList, 'CC')}`);
			if (options.bccList) lines.push(`Bcc: ${addresses(options.bccList, 'BCC')}`);
			if (options.replyTo) lines.push(`Reply-To: ${addresses(options.replyTo, 'ReplyTo')}`);
			const subject = parameters.subject ?? '';
			lines.push(`Subject: ${isAscii(subject) ? subject : `=?UTF-8?B?${base64Utf8(subject)}?=`}`);
			lines.push('MIME-Version: 1.0');
			const type = parameters.emailType ?? 'html';
			const message = String(parameters.message ?? '').trim();
			const text = emailBody(
				type,
				message,
				options.appendAttribution ?? true,
				parameters.instanceId,
			);
			lines.push(`Content-Type: ${type === 'html' ? 'text/html' : 'text/plain'}; charset=utf-8`);
			lines.push('Content-Transfer-Encoding: base64');
			const mime = `${lines.join('\r\n')}\r\n\r\n${wrap(base64Utf8(text), 76)}`;
			// base64url without padding, as the v1 node encodes `raw`.
			let raw = base64Utf8(mime).replaceAll('+', '-').replaceAll('/', '_');
			while (raw.endsWith('=')) raw = raw.slice(0, -1);
			const response = await ctx.http<Item>({
				method: 'POST',
				url: 'https://www.googleapis.com/gmail/v1/users/me/messages/send',
				headers,
				qs: {},
				body: { raw },
				credential,
			});
			if (response.status >= 400) throw new Error(`Gmail: HTTP status ${response.status}`);
			out.push(response.body);
		}
		return out;
	},
});
