/**
 * Compiled library node: a hand port of `n8n-nodes-base.gmail` version 2.2,
 * operations `message.send`, `message.reply`, `thread.reply`, `draft.create`,
 * `message.getAll` and `message.get`, and `message.addLabels`, `removeLabels`,
 * `markAsRead`, `markAsUnread` and `delete`.
 *
 * With `simple` off, v1 parses the raw MIME message with mailparser. `parseRawEmail`
 * here is a port for the messages that it reads exactly as mailparser: text and HTML
 * parts, multiparts, base64 and quoted-printable bodies, encoded words, UTF-8,
 * ISO-8859-1 and Windows-1252. It runs as library code: the native codecs (`atob`,
 * `unescape`, `split`) do the work for each byte, and the bytecode runs once for each
 * line. Each other message ends the node with an error that the converted workflow
 * reads, and the fallback host runs the v1 node: text with a link or with characters
 * that are not ASCII (mailparser makes links with linkify-it and entities with the
 * table of `he`), HTML without a text part at the root (html-to-text), an image by
 * content id, other charsets. The download of attachments runs in the host.
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
	downloadAttachments?: boolean;
	dataPropertyAttachmentsPrefixName?: string;
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
	raw?: string;
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

/** The end of an error that the converted workflow reads: the fallback host runs the node. */
const HOST_MARKER = '(no request to repeat: the fallback host runs the node)';

/** The error for a message whose parsed form is not proven equal to mailparser's. */
function inHost(reason: string): Error {
	return new Error(`Gmail: the fallback host parses this message: ${reason} ${HOST_MARKER}`);
}

function found(source: string, flags: string, input: string): boolean {
	return RegExp.exec(source, flags, input, 0) !== null;
}

/** Windows-1252 bytes 0x80 to 0x9F and their characters. Five bytes have none. */
const CP1252: string[][] = [
	['\x80', '€'],
	['\x82', '‚'],
	['\x83', 'ƒ'],
	['\x84', '„'],
	['\x85', '…'],
	['\x86', '†'],
	['\x87', '‡'],
	['\x88', 'ˆ'],
	['\x89', '‰'],
	['\x8a', 'Š'],
	['\x8b', '‹'],
	['\x8c', 'Œ'],
	['\x8e', 'Ž'],
	['\x91', '‘'],
	['\x92', '’'],
	['\x93', '“'],
	['\x94', '”'],
	['\x95', '•'],
	['\x96', '–'],
	['\x97', '—'],
	['\x98', '˜'],
	['\x99', '™'],
	['\x9a', 'š'],
	['\x9b', '›'],
	['\x9c', 'œ'],
	['\x9e', 'ž'],
	['\x9f', 'Ÿ'],
];

/** The charset of a text part, as a key: `utf8`, `latin1` or `cp1252`. Another charset stays in the host. */
function charsetKey(name: string): string {
	const key = name.toLowerCase().trim().split('-').join('').split('_').join('');
	if (key === 'utf8' || key === 'ascii' || key === 'usascii') return 'utf8';
	if (key === 'iso88591' || key === 'latin1') return 'latin1';
	if (key === 'windows1252' || key === 'cp1252') return 'cp1252';
	throw inHost('a charset other than UTF-8, ISO-8859-1 and Windows-1252');
}

/** The text of bytes (a string with one character for each byte) in a charset. */
function textOf(bytes: string, charset: string): string {
	if (charset === 'latin1' || Ascii.is(bytes)) return bytes;
	if (charset === 'utf8') {
		try {
			// oxlint-disable-next-line typescript/no-deprecated -- the native UTF-8 decoder (spec section 4.3).
			return decodeURIComponent(escape(bytes));
		} catch (error) {
			throw inHost('bytes that are not UTF-8');
		}
	}
	if (!found('[\\x80-\\x9f]', '', bytes)) return bytes;
	if (found('[\\x81\\x8d\\x8f\\x90\\x9d]', '', bytes)) {
		throw inHost('a Windows-1252 byte without a character');
	}
	let out = bytes;
	for (const pair of CP1252) out = out.replaceAll(pair[0], pair[1]);
	return out;
}

/** The bytes of text in which `=XX` is a byte and each other character is itself. */
function hexBytes(text: string): string {
	const parts = text.replaceAll('%', '%25').split('=');
	const out: string[] = [parts[0]];
	for (let k = 1; k < parts.length; k++) {
		out.push(found('^[0-9A-Fa-f]{2}', '', parts[k]) ? '%' : '%3D');
		out.push(parts[k]);
	}
	// oxlint-disable-next-line typescript/no-deprecated -- the native codec makes a byte from `%XX` (spec section 4.3).
	return unescape(out.join(''));
}

/** The bytes of a part body: libbase64 and libqp of mailsplit, for bodies in the usual form. */
function bodyBytes(body: string, encoding: string): string {
	if (encoding === 'base64') {
		const text = body.split('\r').join('').split('\n').join('').split(' ').join('');
		if (text.length % 4 !== 0 || !found('^[A-Za-z0-9+/]*={0,2}$', '', text)) {
			throw inHost('a base64 body that is not in the usual form');
		}
		return atob(text);
	}
	if (encoding !== 'quoted-printable') return body;
	if (!Ascii.is(body) || body.includes('==')) {
		throw inHost('a quoted-printable body that is not in the usual form');
	}
	const kept: string[] = [];
	for (const line of body.split('\n')) {
		const cr = line.endsWith('\r');
		let text = cr ? line.slice(0, -1) : line;
		while (text.endsWith(' ') || text.endsWith('\t')) text = text.slice(0, -1);
		kept.push(cr ? `${text}\r` : text);
	}
	let text = kept.join('\n').replaceAll('=\r\n', '').replaceAll('=\n', '');
	if (text.endsWith('=')) text = text.slice(0, -1);
	return hexBytes(text);
}

/** The charset of an encoded word: only the names that libmime and this port read the same way. */
function wordCharset(name: string): string {
	const star = name.indexOf('*');
	const key = (star >= 0 ? name.slice(0, star) : name).toLowerCase();
	if (key === 'utf-8' || key === 'utf8' || key === 'us-ascii') return 'utf8';
	if (key === 'iso-8859-1') return 'latin1';
	if (key === 'windows-1252') return 'cp1252';
	throw inHost('an encoded word in another charset');
}

/** decodeWord of libmime. */
function decodeWord(charset: string, kind: string, text: string): string {
	if (kind === 'Q') {
		if (found('\\s', '', text)) throw inHost('an encoded word with white space');
		return textOf(hexBytes(text.replaceAll('_', ' ')), charset);
	}
	const bytes: string[] = [];
	for (const piece of text.split('=')) {
		if (piece === '') continue;
		if (piece.length % 4 === 1 || !found('^[A-Za-z0-9+/]+$', '', piece)) {
			throw inHost('an encoded word that is not base64');
		}
		bytes.push(atob(piece));
	}
	return textOf(bytes.join(''), charset);
}

interface EncodedWord {
	from: number;
	to: number;
	charset: string;
	kind: string;
	text: string;
}

/** decodeWords of libmime (RFC 2047): words next to each other in one charset are one word. */
function decodeWords(value: string): string {
	if (!value.includes('=?')) return value;
	const words: EncodedWord[] = [];
	let at = 0;
	const rest: string[] = [];
	for (let n = 0; n < 500; n++) {
		const m = RegExp.exec('=\\?([\\w\\-*]+)\\?([QqBb])\\?([^?]*)\\?=', '', value, at);
		if (m === null) break;
		rest.push(value.slice(at, m[0]));
		words.push({
			from: m[0],
			to: m[1],
			charset: wordCharset(value.slice(m[2], m[3])),
			kind: value.slice(m[4], m[5]).toUpperCase(),
			text: value.slice(m[6], m[7]),
		});
		at = m[1];
	}
	rest.push(value.slice(at));
	if (words.length === 0 || rest.join(' ').includes('=?')) {
		throw inHost('an encoded word of another form');
	}
	const out: string[] = [value.slice(0, words[0].from)];
	let k = 0;
	while (k < words.length) {
		const first = words[k];
		let text = first.text;
		let last = k;
		while (last + 1 < words.length) {
			const next = words[last + 1];
			const gap = value.slice(words[last].to, next.from);
			if (gap.trim() !== '' || next.charset !== first.charset || next.kind !== first.kind) break;
			text += next.text;
			last++;
		}
		out.push(decodeWord(first.charset, first.kind, text));
		if (last + 1 < words.length) {
			const gap = value.slice(words[last].to, words[last + 1].from);
			if (gap.trim() !== '') out.push(gap);
		} else {
			out.push(value.slice(words[last].to));
		}
		k = last + 1;
	}
	return out.join('');
}

interface HeaderLine {
	key: string;
	line: string;
}

/** The header lines of a MIME node, as the Headers class of mailsplit splits them. */
function headerLines(rows: string[]): HeaderLine[] {
	const out: HeaderLine[] = [];
	if (rows.length === 0 || !Ascii.isPrintable(rows.join('').replaceAll('\t', ' '))) {
		throw inHost('headers that are not printable ASCII');
	}
	for (const row of rows) {
		if (row.startsWith(' ') || row.startsWith('\t')) {
			if (out.length === 0) throw inHost('a first header line that starts with white space');
			out[out.length - 1].line += `\r\n${row}`;
			continue;
		}
		const colon = row.indexOf(':');
		if (colon <= 0 || (out.length === 0 && found('^(From|POST) ', 'i', row))) {
			throw inHost('a header line without a name');
		}
		out.push({ key: row.slice(0, colon).toLowerCase().trim(), line: row });
	}
	return out;
}

/** The value of a header line: decodeHeader of libmime. */
function headerValue(line: string): string {
	const parts = line.split('\r\n');
	for (let k = 1; k < parts.length; k++) {
		let part = parts[k];
		while (part.startsWith(' ') || part.startsWith('\t')) part = part.slice(1);
		parts[k] = part;
	}
	const text = parts.join(' ').trim();
	return text.slice(text.indexOf(':') + 1).trim();
}

/** The value of the first header with a key, or an empty string. */
function firstHeader(lines: HeaderLine[], key: string): string {
	for (const entry of lines) if (entry.key === key) return headerValue(entry.line);
	return '';
}

interface StructuredHeader {
	value: string;
	params: Record<string, string>;
}

/** parseHeaderValue of libmime, without the continued parameters of RFC 2231. */
function structured(text: string): StructuredHeader {
	const out: StructuredHeader = { value: '', params: {} };
	let key = '';
	let named = false;
	let value = '';
	let inKey = false;
	let quoted = false;
	let escaped = false;
	const store = () => {
		if (named) out.params[key] = value.trim();
		else out.value = value.trim();
	};
	for (let k = 0; k < text.length; k++) {
		const ch = text.charAt(k);
		if (inKey) {
			if (ch === '=') {
				key = value.trim().toLowerCase();
				named = true;
				inKey = false;
				value = '';
			} else {
				value += ch;
			}
			continue;
		}
		if (escaped) {
			value += ch;
		} else if (ch === '\\') {
			escaped = true;
			continue;
		} else if (quoted && ch === '"') {
			quoted = false;
		} else if (!quoted && ch === '"') {
			quoted = true;
		} else if (!quoted && ch === ';') {
			store();
			inKey = true;
			value = '';
		} else {
			value += ch;
		}
		escaped = false;
	}
	if (!inKey) store();
	else if (value.trim() !== '') out.params[value.trim().toLowerCase()] = '';
	for (const name of Object.keys(out.params)) {
		if (name.includes('*')) throw inHost('a header parameter in more than one part');
	}
	return out;
}

interface MimePart {
	multipart: boolean;
	alternative: boolean;
	boundary: string;
	/** `plain` or `html` for a text part that is not an attachment, else an empty string. */
	text: string;
	charset: string;
	encoding: string;
	contentId: boolean;
}

/** A MIME node from its header lines: parseHeaders of mailsplit and createNode of mailparser. */
function mimePart(lines: HeaderLine[]): MimePart {
	const disposition = structured(firstHeader(lines, 'content-disposition'));
	let typeHeader = firstHeader(lines, 'content-type');
	let typed = false;
	for (const entry of lines) if (entry.key === 'content-type') typed = true;
	if (!typed) {
		if (disposition.params.filename) throw inHost('a part with a file name and no content type');
		typeHeader = found('^attachment$', 'i', disposition.value)
			? 'application/octet-stream'
			: 'text/plain';
	}
	const type = structured(typeHeader);
	const contentType = type.value.toLowerCase().trim();
	const transfer = firstHeader(lines, 'content-transfer-encoding');
	if (contentType === '' || transfer.includes('(') || disposition.value.includes('=?')) {
		throw inHost('a part header of another form');
	}
	const encoding = transfer.toLowerCase().trim();
	let placed = disposition.value.toLowerCase().trim();
	const part: MimePart = {
		multipart: contentType.startsWith('multipart/'),
		alternative: contentType === 'multipart/alternative',
		boundary: type.params.boundary ?? '',
		text: '',
		charset: type.params.charset ? type.params.charset : 'utf-8',
		encoding,
		contentId: false,
	};
	for (const entry of lines) if (entry.key === 'content-id') part.contentId = true;
	if (part.multipart) {
		if (part.boundary === '') throw inHost('a multipart without a boundary');
		return part;
	}
	if (part.boundary !== '') throw inHost('a boundary on a part that is not a multipart');
	if (contentType === 'message/delivery-status') throw inHost('a delivery status part');
	const plain = ['', '7bit', '8bit', 'binary'].includes(encoding);
	if (contentType === 'message/rfc822' && placed === 'inline' && plain) {
		throw inHost('an embedded message');
	}
	const textType = contentType === 'text/plain' || contentType === 'text/html';
	if (placed !== '' && placed !== 'attachment' && placed !== 'inline') placed = 'attachment';
	if (placed === '') placed = textType ? 'inline' : 'attachment';
	if (!textType || placed !== 'inline') return part;
	if ((type.params.format ?? '').toLowerCase().trim() === 'flowed') {
		throw inHost('flowed text');
	}
	part.text = contentType === 'text/plain' ? 'plain' : 'html';
	part.charset = charsetKey(part.charset);
	return part;
}

/** textToHtml of mailparser for text without links: `he.encode` with named references. */
function textToHtml(text: string): string {
	if (!Ascii.is(text)) throw inHost('text that is not ASCII, for the HTML form');
	if (found('https?:|mailto:|git:|//|@|localhost|www\\.|\\.[a-z0-9]', 'i', text)) {
		throw inHost('text that can hold a link, for the HTML form');
	}
	if (found('[\\x00-\\x08\\x0b-\\x1f\\x7f]', '', text)) {
		throw inHost('text with control characters, for the HTML form');
	}
	const encoded = text
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('`', '&grave;')
		.replaceAll('\t', '&#x9;');
	const lines = encoded.trim().split('\n');
	for (let k = 0; k < lines.length; k++) {
		let line = lines[k];
		while (line.endsWith(' ')) line = line.slice(0, -1);
		lines[k] = line;
	}
	let body = lines.join('\n').trim();
	while (body.includes('\n\n\n')) body = body.replaceAll('\n\n\n', '\n\n');
	return `<p>${body.replaceAll('\n\n', '</p><p>').trim().replaceAll('\n', '<br/>')}</p>`;
}

/** `he.encode` with its default options: a numeric reference for each character that is not safe. */
function encodeEntities(text: string): string {
	if (Ascii.isPrintable(text) && !found('["&\'<>`]', '', text)) return text;
	const out: string[] = [];
	for (let k = 0; k < text.length; k++) {
		let code = text.charCodeAt(k);
		const low = k + 1 < text.length ? text.charCodeAt(k + 1) : 0;
		if (code >= 0xd800 && code <= 0xdbff && low >= 0xdc00 && low <= 0xdfff) {
			code = (code - 0xd800) * 0x400 + low - 0xdc00 + 0x10000;
			k++;
		} else {
			const safe =
				(code >= 0x20 && code <= 0x7e && !'"&\'<>`'.includes(text.charAt(k))) ||
				code === 0 ||
				code === 10 ||
				code === 13 ||
				(code >= 0x80 && code <= 0x9f && ![0x81, 0x8d, 0x8f, 0x90, 0x9d].includes(code));
			if (safe) {
				out.push(text.charAt(k));
				continue;
			}
		}
		out.push(`&#x${code.toString(16).toUpperCase()};`);
	}
	return out.join('');
}

interface ParsedAddress {
	address: string;
	name: string;
}

const ADDRESS = '[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+';

/**
 * An address header as mailparser gives it: the addresses, and their HTML and text forms.
 * The port reads the usual forms: `a@b`, `<a@b>`, `Name <a@b>` and `"Name" <a@b>` in a list
 * with commas. Groups, comments and escapes stay in the host.
 */
function addressHeader(value: string): Record<string, unknown> {
	const entries: string[] = [];
	if (value.includes('\\')) throw inHost('an address with an escape');
	if (value !== '') {
		let quoted = false;
		let from = 0;
		for (let k = 0; k < value.length; k++) {
			const ch = value.charAt(k);
			if (ch === '"') quoted = !quoted;
			if (ch === ',' && !quoted) {
				entries.push(value.slice(from, k).trim());
				from = k + 1;
			}
		}
		entries.push(value.slice(from).trim());
	}
	const list: ParsedAddress[] = [];
	const pattern = `^(?:(${ADDRESS})|<(${ADDRESS})>|"([^"]+)"\\s*<(${ADDRESS})>|([^"<>(),;:@\\[\\]]+)<(${ADDRESS})>)$`;
	for (const entry of entries) {
		const m = RegExp.exec(pattern, '', entry, 0);
		if (m === null) throw inHost('an address of another form');
		let address = '';
		let name = '';
		if (m[2] >= 0) {
			address = entry.slice(m[2], m[3]);
		} else if (m[4] >= 0) {
			address = entry.slice(m[4], m[5]);
		} else if (m[8] >= 0) {
			name = entry.slice(m[6], m[7]);
			address = entry.slice(m[8], m[9]);
			if (name !== name.trim() || name.includes('  ')) throw inHost('a quoted name with spaces');
		} else {
			name = entry.slice(m[10], m[11]).trim();
			address = entry.slice(m[12], m[13]);
			if (name === '') throw inHost('an address of another form');
		}
		if (address.toLowerCase().includes('@xn--')) throw inHost('an address with a Punycode domain');
		if (name !== '') name = decodeWords(name).trim();
		list.push({ address, name });
	}
	const html: string[] = [];
	const text: string[] = [];
	for (const entry of list) {
		const link = `<a href="mailto:${entry.address}" class="mp_address_email">${entry.address}</a>`;
		html.push(
			entry.name
				? `<span class="mp_address_group"><span class="mp_address_name">${encodeEntities(entry.name)}</span> &lt;${link}&gt;</span>`
				: `<span class="mp_address_group">${link}</span>`,
		);
		text.push(entry.name ? `"${entry.name}" <${entry.address}>` : entry.address);
	}
	return { value: list, html: html.join(', '), text: text.join(', ') };
}

/** ensureMessageIDFormat of mailparser. */
function messageIdForm(value: string): string {
	let id = value;
	if (id.charAt(0) !== '<') id = `<${id}`;
	if (id.charAt(id.length - 1) !== '>') id = `${id}>`;
	return id;
}

/** The fields that simpleParser reads from the headers of the message, in its order. */
function headerFields(lines: HeaderLine[]): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const values = (key: string): string[] => {
		const list: string[] = [];
		for (const entry of lines) if (entry.key === key) list.push(headerValue(entry.line));
		return list;
	};
	const subjects = values('subject').filter((value) => value !== '');
	if (subjects.length > 0) {
		const subject = decodeWords(subjects[subjects.length - 1]);
		if (subject === '') throw inHost('a subject that decodes to nothing');
		out.subject = subject;
	}
	const references: string[] = [];
	for (const value of values('references')) {
		if (value === '') throw inHost('an empty References header');
		for (const id of decodeWords(value).replaceAll('\t', ' ').split(' ')) {
			if (id !== '') references.push(messageIdForm(id));
		}
	}
	if (references.length > 0) out.references = references.length === 1 ? references[0] : references;
	const dates = values('date').filter((value) => value !== '');
	if (dates.length > 0) {
		const text = dates[dates.length - 1];
		const zone = '(?:[+-]\\d{4}|GMT|UT)(?: \\([A-Za-z]+\\))?';
		const form = `^(?:[A-Za-z]{3}, )?\\d{1,2} [A-Za-z]{3} \\d{4} \\d{2}:\\d{2}(?::\\d{2})? ${zone}$`;
		const paren = text.indexOf(' (');
		const time = Date.parse(paren < 0 ? text : text.slice(0, paren));
		if (!found(form, '', text) || isNaN(time)) throw inHost('a date of another form');
		out.date = new Date(time).toISOString();
	}
	for (const key of ['to', 'from', 'cc', 'bcc']) {
		const list = values(key).map((value) => addressHeader(value));
		if (list.length === 0) continue;
		out[key] = key === 'from' || list.length === 1 ? list[list.length - 1] : list;
	}
	for (const key of ['message-id', 'in-reply-to']) {
		const list = values(key).filter((value) => value !== '');
		if (list.length === 0) continue;
		const id = decodeWords(list[list.length - 1]);
		if (id === '') throw inHost('a message id that decodes to nothing');
		out[key === 'message-id' ? 'messageId' : 'inReplyTo'] = messageIdForm(id);
	}
	const replies = values('reply-to').map((value) => addressHeader(value));
	if (replies.length > 0) out.replyTo = replies[replies.length - 1];
	return out;
}

interface TextPart {
	html: boolean;
	content: string;
	alternative: boolean;
	root: boolean;
}

/**
 * parseRawEmail of the v1 node without the download of attachments: the message of the Gmail
 * API in the `raw` format, as `simpleParser` of mailparser 3.9 reads it. The port gives the
 * result only for a message whose parts it reads exactly as mailparser; each other message
 * ends with the error that sends the node to the fallback host.
 */
function parseRawEmail(message: GmailMessage): Item {
	let bytes = '';
	try {
		bytes = atob(String(message.raw).replaceAll('-', '+').replaceAll('_', '/'));
	} catch (error) {
		throw inHost('a raw value that is not base64');
	}
	if (!Ascii.is(bytes)) textOf(bytes, 'utf8');
	if (bytes.replaceAll('\r\n', '').includes('\r')) throw inHost('a carriage return alone');
	const lines = bytes.split('\n');
	const open: MimePart[] = [];
	const texts: TextPart[] = [];
	let rootLines: HeaderLine[] | undefined;
	let head: string[] = [];
	let state = 'head';
	let leaf: MimePart | undefined;
	let leafFrom = 0;
	let contentIds = false;
	let hasText = false;
	let hasHtml = false;
	const endLeaf = (to: number, last: boolean) => {
		const part = leaf;
		leaf = undefined;
		if (part === undefined) return;
		if (part.contentId && part.text === '') contentIds = true;
		if (part.text === '') return;
		let body = lines.slice(leafFrom, to).join('\n');
		if (!last && to === leafFrom + 1 && (body === '' || body === '\r')) {
			throw inHost('a part whose body is one line break');
		}
		if (!last && body.endsWith('\r')) body = body.slice(0, -1);
		const content = textOf(bodyBytes(body, part.encoding), part.charset).replaceAll('\r\n', '\n');
		let alternative = false;
		for (const parent of open) if (parent.alternative) alternative = true;
		if (part.text === 'plain') hasText = true;
		else hasHtml = true;
		texts.push({ html: part.text === 'html', content, alternative, root: open.length === 0 });
	};
	for (let k = 0; k < lines.length; k++) {
		const ended = k < lines.length - 1;
		const raw = lines[k];
		const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
		if (open.length > 0 && line.startsWith('--')) {
			let match = -1;
			for (let p = 0; p < open.length; p++) {
				if (line.startsWith(`--${open[p].boundary}`)) match = p;
			}
			if (match >= 0) {
				const boundary = open[open.length - 1].boundary;
				const closes = line === `--${boundary}--`;
				if (
					match !== open.length - 1 ||
					state === 'head' ||
					!(closes || line === `--${boundary}`)
				) {
					throw inHost('a boundary line in another place');
				}
				if (!closes && !ended) throw inHost('a boundary line that ends the message');
				endLeaf(k, false);
				if (closes) {
					open.pop();
					state = 'skip';
				} else {
					state = 'head';
					head = [];
				}
				continue;
			}
		}
		if (state !== 'head') continue;
		if (!ended) throw inHost('headers without a body');
		if (line !== '') {
			head.push(line);
			continue;
		}
		const parsed = headerLines(head);
		if (rootLines === undefined) rootLines = parsed;
		const part = mimePart(parsed);
		if (part.multipart) {
			for (const parent of open) {
				if (
					parent.boundary.startsWith(part.boundary) ||
					part.boundary.startsWith(parent.boundary)
				) {
					throw inHost('boundaries that start the same way');
				}
			}
			open.push(part);
			state = 'skip';
		} else {
			leaf = part;
			leafFrom = k + 1;
			state = 'body';
		}
	}
	if (open.length > 0 || rootLines === undefined) throw inHost('a multipart that does not end');
	endLeaf(lines.length, true);
	const htmlParts: string[] = [];
	const textParts: string[] = [];
	for (const part of texts) {
		if (part.content === '') continue;
		if (!part.html) {
			textParts.push(part.content);
			if (!part.alternative && hasHtml) htmlParts.push(textToHtml(part.content));
			continue;
		}
		if ((!part.alternative && hasText) || (part.root && !hasText)) {
			throw inHost('HTML that mailparser turns into text');
		}
		htmlParts.push(part.content);
	}
	const html = htmlParts.join('<br/>\n');
	if (contentIds && found('\\bcid:', '', html)) throw inHost('an image in the HTML by content id');
	const headers: Record<string, unknown> = {};
	for (const entry of rootLines) headers[entry.key] = entry.line;
	const out: Record<string, unknown> = {};
	for (const key of ['id', 'threadId', 'labelIds', 'sizeEstimate']) {
		if (message[key] !== undefined) out[key] = message[key];
	}
	out.headers = headers;
	if (htmlParts.length > 0) out.html = html;
	if (textParts.length > 0) {
		out.text = textParts.join('\n');
		out.textAsHtml = textParts.map((part) => textToHtml(part)).join('<br/>\n');
	}
	const fields = headerFields(rootLines);
	for (const key of Object.keys(fields)) out[key] = fields[key];
	if (htmlParts.length === 0) out.html = false;
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
				'simple=true|false',
				'filters',
				'filters.includeSpamTrash',
				'filters.labelIds',
				'filters.q',
				'filters.readStatus',
				'filters.receivedAfter',
				'filters.receivedBefore',
				'filters.sender',
				'options',
				'options.downloadAttachments=false',
				'options.dataPropertyAttachmentsPrefixName',
			],
			'message.get': [
				'authentication',
				'messageId',
				'simple=true|false',
				'options',
				'options.downloadAttachments=false',
				'options.dataPropertyAttachmentsPrefixName',
			],
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
		// Without "simplify", v1 reads the raw message and parses it (parseRawEmail).
		const raw = parameters.simple === false;
		if (raw && (parameters.options ?? {}).downloadAttachments === true) {
			throw new Error('Gmail: the download of attachments is not in the compiled library');
		}
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
					raw ? { format: 'raw' } : metadata,
				);
				out.push(raw ? parseRawEmail(message) : simplify(message, await labelList()));
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
				const messageQs: Record<string, unknown> = raw
					? { ...qs, format: 'raw' }
					: { ...qs, ...metadata };
				const messages: GmailMessage[] = [];
				for (const entry of list) {
					messages.push(await get<GmailMessage>(`${api}/messages/${entry.id}`, messageQs));
				}
				if (raw) {
					for (const message of messages) out.push(parseRawEmail(message));
					continue;
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
