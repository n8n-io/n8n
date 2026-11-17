/**
 * Compiled library node: a hand port of `n8n-nodes-base.gmail` version 2.2,
 * operations `message.send`, `message.reply`, `thread.reply`, `draft.create`,
 * `message.getAll` and `message.get` with
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
 * The builder writes a base64 body and one encoded word for a subject or a
 * display name that is not ASCII, with the native codec: MailComposer chooses
 * 7bit, quoted-printable or base64 and folds long headers. A reader decodes
 * both forms to the same message. The same bytes need a native
 * quoted-printable encoder in the runtime: a loop for each byte of the body in
 * the bytecode costs more than the whole node.
 *
 * A reply reads the addresses of the message with a port of the
 * `addressparser` of nodemailer for the usual forms (names, quoted names,
 * comments, lists, groups).
 *
 * Limits: attachments and the service account authentication are not supported.
 * The attribution link has no instance id: a compiled workflow does not know
 * the n8n instance.
 */
import { apiError, defineNode, type FailedResponse, type Item } from '@n8n/workflow-lang';

interface GmailOptions {
	appendAttribution?: boolean;
	bccList?: string;
	ccList?: string;
	senderName?: string;
	replyTo?: string;
	sendTo?: string;
	fromAlias?: string;
	threadId?: unknown;
	replyToSenderOnly?: boolean;
	replyToRecipientsOnly?: boolean;
}

interface Address {
	name: string;
	address: string;
}

interface Email {
	from: string;
	to: string;
	cc: string;
	bcc: string;
	replyTo: string;
	inReplyTo: string;
	subject: string;
	type: string;
	text: string;
}

interface MessageHeader {
	name?: string;
	value?: string;
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
	/** From version 2.2 a reply goes to the `Reply-To` address of the message when it has one. */
	replyToHeader?: boolean;
	/** The index of the item in the input, for the messages of v1. */
	itemIndex?: number;
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

/** A header value on one line: MailComposer writes a space for each line break. */
function oneLine(text: string): string {
	if (!text.includes('\n') && !text.includes('\r')) return text;
	return text.split('\r\n').join(' ').split('\n').join(' ').split('\r').join(' ');
}

/**
 * The addresses of a header value, as the `addressparser` of nodemailer reads them with
 * `flatten`: `Name <a@b>`, `"Quoted, name" <a@b>`, `a@b`, `a@b (Name)`, lists with `,` or
 * `;`, and the members of a group.
 */
function parseAddresses(input: string): Address[] {
	const out: Address[] = [];
	let words: string[] = [];
	let word = '';
	let comment = '';
	let address = '';
	let state = '';
	const endWord = () => {
		if (word !== '') words.push(word);
		word = '';
	};
	const endEntry = () => {
		endWord();
		let found = address.trim();
		if (found === '') {
			// Without angle brackets the last word with an `@` is the address.
			for (let k = words.length - 1; k >= 0; k--) {
				if (RegExp.exec('^[^@\\s]+@[^@\\s]+$', '', words[k], 0) !== null) {
					found = words[k];
					words = words.slice(0, k).concat(words.slice(k + 1));
					break;
				}
			}
		}
		const name = words.join(' ').trim();
		if (found !== '') out.push({ name: name !== '' ? name : comment.trim(), address: found });
		words = [];
		comment = '';
		address = '';
	};
	for (let k = 0; k < input.length; k++) {
		const ch = input.charAt(k);
		if (state === '"') {
			if (ch === '\\' && k + 1 < input.length) {
				word += input.charAt(k + 1);
				k++;
			} else if (ch === '"') {
				state = '';
				if (word === '') words.push('');
			} else {
				word += ch;
			}
		} else if (state === '(') {
			if (ch === ')') state = '';
			else comment += ch;
		} else if (state === '<') {
			if (ch === '>') state = '';
			else address += ch;
		} else if (ch === '"' || ch === '(' || ch === '<') {
			if (ch !== '"') endWord();
			state = ch;
		} else if (ch === ',' || ch === ';') {
			endEntry();
		} else if (ch === ':') {
			// The name of a group: `flatten` gives only its members.
			word = '';
			words = [];
		} else if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
			endWord();
		} else {
			word += ch;
		}
	}
	endEntry();
	return out;
}

/** One address as MailComposer writes it: a plain name, a quoted name or an encoded word. */
function headerAddress(entry: Address): string {
	const address = oneLine(entry.address);
	const name = oneLine(entry.name);
	if (name === '') return `<${address}>`;
	if (RegExp.exec('^[A-Za-z0-9_ ]*$', '', name, 0) !== null) return `${name} <${address}>`;
	if (Ascii.isPrintable(name)) {
		return `"${name.split('\\').join('\\\\').split('"').join('\\"')}" <${address}>`;
	}
	return `=?UTF-8?B?${base64Utf8(name)}?= <${address}>`;
}

function headerAddresses(list: Address[]): string {
	return list.map((entry) => headerAddress(entry)).join(', ');
}

/** prepareEmailsInput of the v1 node, as a header value. */
function addresses(input: string, index: number): string {
	const out: string[] = [];
	for (const entry of String(input).split(',')) {
		const email = entry.trim();
		if (!email.includes('@')) {
			// The loop of the v1 node adds the index of the item to each message.
			throw new Error(`Invalid email address (item ${index})`);
		}
		out.push(email.includes('<') && email.includes('>') ? email : `<${email}>`);
	}
	return headerAddresses(parseAddresses(out.join(', ')));
}

/** The display name of a reply address, as formatDisplayName of the v1 node quotes it. */
function replyName(name: string): string {
	if (RegExp.exec('["(),:;<>@[\\]\\\\]', '', name, 0) === null) return name;
	return `"${name.split('\\').join('\\\\').split('"').join('\\"')}"`;
}

/** The MIME message of an email, as base64url without padding (encodeEmail of the v1 node). */
function encodeEmail(email: Email): string {
	const lines: string[] = [];
	if (email.from) lines.push(`From: ${email.from}`);
	if (email.to) lines.push(`To: ${email.to}`);
	if (email.cc) lines.push(`Cc: ${email.cc}`);
	if (email.bcc) lines.push(`Bcc: ${email.bcc}`);
	if (email.replyTo) lines.push(`Reply-To: ${email.replyTo}`);
	if (email.inReplyTo) {
		let id = oneLine(email.inReplyTo);
		if (!id.startsWith('<')) id = `<${id}`;
		if (!id.endsWith('>')) id = `${id}>`;
		lines.push(`In-Reply-To: ${id}`);
		lines.push(`References: ${id}`);
	}
	const subject = oneLine(email.subject);
	if (subject) {
		lines.push(`Subject: ${isAscii(subject) ? subject : `=?UTF-8?B?${base64Utf8(subject)}?=`}`);
	}
	lines.push('MIME-Version: 1.0');
	const html = email.type === 'html';
	lines.push(`Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`);
	lines.push('Content-Transfer-Encoding: base64');
	const mime = `${lines.join('\r\n')}\r\n\r\n${wrap(base64Utf8(email.text), 76)}`;
	let raw = base64Utf8(mime).replaceAll('+', '-').replaceAll('/', '_');
	while (raw.endsWith('=')) raw = raw.slice(0, -1);
	return raw;
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
			'message.reply': [
				'authentication',
				'messageId',
				'emailType',
				'message',
				'options',
				'options.bccList',
				'options.ccList',
				'options.senderName',
				'options.replyToSenderOnly',
				'replyToHeader',
				'itemIndex',
			],
			'thread.reply': [
				'authentication',
				'threadId',
				'messageId',
				'emailType',
				'message',
				'options',
				'options.bccList',
				'options.ccList',
				'options.senderName',
				'options.replyToSenderOnly',
				'options.replyToRecipientsOnly',
				'replyToHeader',
				'itemIndex',
			],
			'draft.create': [
				'authentication',
				'subject',
				'emailType',
				'message',
				'options',
				'options.bccList',
				'options.ccList',
				'options.fromAlias',
				'options.replyTo',
				'options.threadId',
				'options.sendTo',
				'itemIndex',
			],
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
				'itemIndex',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'message';
		const operation = parameters.operation ?? 'send';
		const modify = ['addLabels', 'removeLabels', 'markAsRead', 'markAsUnread'];
		const known = ['send', 'get', 'getAll', 'delete'].concat(modify);
		const composed =
			(resource === 'draft' && operation === 'create') ||
			(resource === 'thread' && operation === 'reply');
		if (!composed && (resource !== 'message' || !known.concat(['reply']).includes(operation))) {
			throw new Error(`Gmail: ${resource}.${operation} is not in the compiled library`);
		}
		if ((parameters.authentication ?? 'oAuth2') !== 'oAuth2') {
			throw new Error('Gmail: only OAuth2 authentication is in the compiled library');
		}
		const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
		const api = 'https://www.googleapis.com/gmail/v1/users/me';
		// The item loop of the v1 node catches the NodeApiError of googleApiRequest
		// (`helpers.requestWithAuthentication`) and throws a NodeOperationError with ` (item N)`.
		let position = -1;
		const requestFailure = (response: FailedResponse): Error =>
			apiError(response, {
				helper: 'legacy',
				itemSuffix: parameters.itemIndex ?? (position < 0 ? 0 : position),
				operationError: true,
			});
		const get = async <T>(url: string, qs: Record<string, unknown>): Promise<T> => {
			const response = await ctx.http<T>({
				acceptAs: 'legacy',
				json: true,
				method: 'GET',
				url,
				headers,
				qs,
				body: undefined,
				credential,
			});
			if (response.status >= 400) throw requestFailure(response);
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
				position++;
				const url = `${api}/messages/${String(parameters.messageId ?? '')}`;
				if (operation === 'delete') {
					const response = await ctx.http<unknown>({
						acceptAs: 'legacy',
						json: true,
						method: 'DELETE',
						url,
						headers,
						qs: {},
						body: undefined,
						credential,
					});
					if (response.status >= 400) throw requestFailure(response);
					out.push({ success: true });
					continue;
				}
				// users.messages.modify: the label changes of each operation.
				let body: Record<string, unknown> = { removeLabelIds: ['UNREAD'] };
				if (operation === 'markAsUnread') body = { addLabelIds: ['UNREAD'] };
				if (operation === 'addLabels') body = { addLabelIds: parameters.labelIds };
				if (operation === 'removeLabels') body = { removeLabelIds: parameters.labelIds };
				const response = await ctx.http<Item>({
					acceptAs: 'legacy',
					json: true,
					method: 'POST',
					url: `${url}/modify`,
					headers,
					qs: {},
					body,
					credential,
				});
				if (response.status >= 400) throw requestFailure(response);
				out.push(response.body);
			}
			return out;
		}
		if (operation === 'get') {
			const out: Item[] = [];
			for (const _item of items ?? [{}]) {
				position++;
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
				position++;
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
		const post = async (url: string, qs: Record<string, unknown>, body: unknown): Promise<Item> => {
			const response = await ctx.http<Item>({
				acceptAs: 'legacy',
				json: true,
				method: 'POST',
				url,
				headers,
				qs,
				body,
				credential,
			});
			if (response.status >= 400) throw requestFailure(response);
			return response.body;
		};
		const index = parameters.itemIndex ?? 0;
		const type = parameters.emailType ?? (resource === 'message' ? 'html' : 'text');
		const message = String(parameters.message ?? '').trim();
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			position++;
			if (operation === 'reply') {
				// replyToEmail of the v1 node.
				if (options.replyToSenderOnly && options.replyToRecipientsOnly) {
					throw new Error(
						`Both "Reply to Sender Only" and "Reply to Recipient Only" cannot be enabled at the same time. Please select only one option. (item ${index})`,
					);
				}
				const cc = options.ccList ? addresses(options.ccList, index) : '';
				const bcc = options.bccList ? addresses(options.bccList, index) : '';
				const original = await get<{
					payload?: { headers?: MessageHeader[] };
					threadId?: unknown;
				}>(`${api}/messages/${String(parameters.messageId)}`, { format: 'metadata' });
				const list = original.payload?.headers ?? [];
				const valueOf = (name: string): string => {
					for (const header of list) {
						if ((header.name ?? '').toLowerCase() === name) return header.value || '';
					}
					return '';
				};
				const profile = await get<{ emailAddress?: string }>(`${api}/profile`, {});
				const self = String(profile.emailAddress);
				let sender = 'from';
				if (parameters.replyToHeader === true) {
					for (const header of list) {
						if ((header.name ?? '').toLowerCase() === 'reply-to') sender = 'reply-to';
					}
				}
				// The recipients without the repeats, as `uniq` of the text that v1 writes.
				const seen: string[] = [];
				const to: Address[] = [];
				const add = (value: string, excludeSelf: boolean) => {
					for (const entry of parseAddresses(value)) {
						if (excludeSelf && entry.address.toLowerCase() === self.toLowerCase()) continue;
						const text = entry.name
							? `${replyName(entry.name)} <${entry.address}>`
							: `<${entry.address}>`;
						if (seen.includes(text)) continue;
						seen.push(text);
						to.push(entry);
					}
				};
				for (const header of list) {
					const name = (header.name || '').toLowerCase();
					if (name === sender && !options.replyToRecipientsOnly) add(header.value ?? '', false);
					if (name === 'to' && !options.replyToSenderOnly) add(header.value ?? '', true);
				}
				const raw = encodeEmail({
					from: options.senderName
						? headerAddresses(parseAddresses(`${options.senderName} <${self}>`))
						: '',
					to: headerAddresses(to),
					cc,
					bcc,
					replyTo: '',
					inReplyTo: valueOf('message-id'),
					subject: valueOf('subject'),
					type,
					text: message,
				});
				out.push(
					await post(
						`${api}/messages/send`,
						{ format: 'metadata' },
						{ raw, threadId: original.threadId },
					),
				);
				continue;
			}
			if (resource === 'draft') {
				const threadId =
					options.threadId && typeof options.threadId === 'string' ? options.threadId : '';
				const email: Email = {
					from: options.fromAlias ? headerAddresses(parseAddresses(options.fromAlias)) : '',
					to: options.sendTo ? addresses(options.sendTo, index) : '',
					cc: options.ccList ? addresses(options.ccList, index) : '',
					bcc: options.bccList ? addresses(options.bccList, index) : '',
					replyTo: options.replyTo ? addresses(options.replyTo, index) : '',
					inReplyTo: '',
					subject: parameters.subject ?? '',
					type,
					text: message,
				};
				if (threadId) {
					// addThreadHeadersToEmail of the v1 node: the id of the last message of the thread.
					const thread = await get<{ messages?: Array<{ payload: { headers: MessageHeader[] } }> }>(
						`${api}/threads/${threadId}`,
						{ format: 'metadata', metadataHeaders: ['Message-ID'] },
					);
					const messages = thread.messages;
					if (messages) {
						for (const header of messages[messages.length - 1].payload.headers) {
							const name = (header.name ?? '').toLowerCase();
							if (name.includes('message') && name.includes('id')) {
								email.inReplyTo = header.value ?? '';
								break;
							}
						}
					}
				}
				const draft: Record<string, unknown> = { raw: encodeEmail(email) };
				if (threadId) draft.threadId = threadId;
				out.push(await post(`${api}/drafts`, {}, { message: draft }));
				continue;
			}
			let from = '';
			if (options.senderName) {
				const profile = await get<{ emailAddress?: string }>(`${api}/profile`, {});
				from = headerAddresses(
					parseAddresses(`${options.senderName} <${String(profile.emailAddress)}>`),
				);
			}
			const raw = encodeEmail({
				from,
				to: addresses(parameters.sendTo ?? '', index),
				cc: options.ccList ? addresses(options.ccList, index) : '',
				bcc: options.bccList ? addresses(options.bccList, index) : '',
				replyTo: options.replyTo ? addresses(options.replyTo, index) : '',
				inReplyTo: '',
				subject: parameters.subject ?? '',
				type,
				text: emailBody(type, message, options.appendAttribution ?? true, parameters.instanceId),
			});
			out.push(await post(`${api}/messages/send`, {}, { raw }));
		}
		return out;
	},
});
