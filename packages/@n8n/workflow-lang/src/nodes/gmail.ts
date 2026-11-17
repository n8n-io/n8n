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
 * line. The HTML form of the text has the links of linkify-it (its patterns, built as
 * linkify-it builds them, with the TLD list) and the named references of `he` (its
 * table). Each other message ends the node with an error that the converted workflow
 * reads, and the fallback host runs the v1 node: HTML without a text part at the root
 * (html-to-text), an image by content id, other charsets, a text line over 4,000
 * characters. The host sends the GET requests again, so the converter links this read
 * only with `repeatRequestsInHost`. The download of attachments runs in the host.
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

// tables:start (scripts/gmail-mail-tables.ts)
const UC_ANY =
	'[\\0-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]';
const UC_CC = '[\\0-\\x1F\\x7F-\\x9F]';
const UC_Z = '[ \\xA0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]';
const UC_P =
	'[!-#%-\\*,-\\/:;\\?@\\[-\\]_\\{\\}\\xA1\\xA7\\xAB\\xB6\\xB7\\xBB\\xBF\\u037E\\u0387\\u055A-\\u055F\\u0589\\u058A\\u05BE\\u05C0\\u05C3\\u05C6\\u05F3\\u05F4\\u0609\\u060A\\u060C\\u060D\\u061B\\u061D-\\u061F\\u066A-\\u066D\\u06D4\\u0700-\\u070D\\u07F7-\\u07F9\\u0830-\\u083E\\u085E\\u0964\\u0965\\u0970\\u09FD\\u0A76\\u0AF0\\u0C77\\u0C84\\u0DF4\\u0E4F\\u0E5A\\u0E5B\\u0F04-\\u0F12\\u0F14\\u0F3A-\\u0F3D\\u0F85\\u0FD0-\\u0FD4\\u0FD9\\u0FDA\\u104A-\\u104F\\u10FB\\u1360-\\u1368\\u1400\\u166E\\u169B\\u169C\\u16EB-\\u16ED\\u1735\\u1736\\u17D4-\\u17D6\\u17D8-\\u17DA\\u1800-\\u180A\\u1944\\u1945\\u1A1E\\u1A1F\\u1AA0-\\u1AA6\\u1AA8-\\u1AAD\\u1B5A-\\u1B60\\u1B7D\\u1B7E\\u1BFC-\\u1BFF\\u1C3B-\\u1C3F\\u1C7E\\u1C7F\\u1CC0-\\u1CC7\\u1CD3\\u2010-\\u2027\\u2030-\\u2043\\u2045-\\u2051\\u2053-\\u205E\\u207D\\u207E\\u208D\\u208E\\u2308-\\u230B\\u2329\\u232A\\u2768-\\u2775\\u27C5\\u27C6\\u27E6-\\u27EF\\u2983-\\u2998\\u29D8-\\u29DB\\u29FC\\u29FD\\u2CF9-\\u2CFC\\u2CFE\\u2CFF\\u2D70\\u2E00-\\u2E2E\\u2E30-\\u2E4F\\u2E52-\\u2E5D\\u3001-\\u3003\\u3008-\\u3011\\u3014-\\u301F\\u3030\\u303D\\u30A0\\u30FB\\uA4FE\\uA4FF\\uA60D-\\uA60F\\uA673\\uA67E\\uA6F2-\\uA6F7\\uA874-\\uA877\\uA8CE\\uA8CF\\uA8F8-\\uA8FA\\uA8FC\\uA92E\\uA92F\\uA95F\\uA9C1-\\uA9CD\\uA9DE\\uA9DF\\uAA5C-\\uAA5F\\uAADE\\uAADF\\uAAF0\\uAAF1\\uABEB\\uFD3E\\uFD3F\\uFE10-\\uFE19\\uFE30-\\uFE52\\uFE54-\\uFE61\\uFE63\\uFE68\\uFE6A\\uFE6B\\uFF01-\\uFF03\\uFF05-\\uFF0A\\uFF0C-\\uFF0F\\uFF1A\\uFF1B\\uFF1F\\uFF20\\uFF3B-\\uFF3D\\uFF3F\\uFF5B\\uFF5D\\uFF5F-\\uFF65]|\\uD800[\\uDD00-\\uDD02\\uDF9F\\uDFD0]|\\uD801\\uDD6F|\\uD802[\\uDC57\\uDD1F\\uDD3F\\uDE50-\\uDE58\\uDE7F\\uDEF0-\\uDEF6\\uDF39-\\uDF3F\\uDF99-\\uDF9C]|\\uD803[\\uDEAD\\uDF55-\\uDF59\\uDF86-\\uDF89]|\\uD804[\\uDC47-\\uDC4D\\uDCBB\\uDCBC\\uDCBE-\\uDCC1\\uDD40-\\uDD43\\uDD74\\uDD75\\uDDC5-\\uDDC8\\uDDCD\\uDDDB\\uDDDD-\\uDDDF\\uDE38-\\uDE3D\\uDEA9]|\\uD805[\\uDC4B-\\uDC4F\\uDC5A\\uDC5B\\uDC5D\\uDCC6\\uDDC1-\\uDDD7\\uDE41-\\uDE43\\uDE60-\\uDE6C\\uDEB9\\uDF3C-\\uDF3E]|\\uD806[\\uDC3B\\uDD44-\\uDD46\\uDDE2\\uDE3F-\\uDE46\\uDE9A-\\uDE9C\\uDE9E-\\uDEA2\\uDF00-\\uDF09]|\\uD807[\\uDC41-\\uDC45\\uDC70\\uDC71\\uDEF7\\uDEF8\\uDF43-\\uDF4F\\uDFFF]|\\uD809[\\uDC70-\\uDC74]|\\uD80B[\\uDFF1\\uDFF2]|\\uD81A[\\uDE6E\\uDE6F\\uDEF5\\uDF37-\\uDF3B\\uDF44]|\\uD81B[\\uDE97-\\uDE9A\\uDFE2]|\\uD82F\\uDC9F|\\uD836[\\uDE87-\\uDE8B]|\\uD83A[\\uDD5E\\uDD5F]';
const LINK_TLDS =
	'한국|삼성|닷컴|닷넷|香港|香格里拉|餐厅|食品|飞利浦|電訊盈科|集团|通販|购物|谷歌|联通|网络|网站|网店|网址|组织机构|移动|点看|澳門|游戏|淡马锡|机构|書籍|时尚|新闻|新加坡|政府|政务|招聘|手机|我爱你|慈善|微博|广东|家電|娱乐|天主教|大拿|在线|嘉里大酒店|嘉里|商标|商店|商城|台灣|台湾|公益|公司|八卦|健康|信息|佛山|企业|亚马逊|中文网|中國|中国|中信|世界|ポイント|ファッション|セール|ストア|コム|グーグル|クラウド|アマゾン|みんな|გე|ລາວ|ไทย|คอม|ලංකා|ഭാരതം|ಭಾರತ|భారత్|சிங்கப்பூர்|இலங்கை|இந்தியா|ଭାରତ|ભારત|ਭਾਰਤ|ভাৰত|ভারত|বাংলা|संगठन|भारोत|भारतम्|भारत|नेट|कॉम|ڀارت|پاکستان|همراه|موقع|موريتانيا|مليسيا|مصر|كوم|كاثوليك|قطر|فلسطين|عمان|عرب|عراق|شبكة|سورية|سودان|تونس|بھارت|بيتك|بازار|بارت|ایران|امارات|المغرب|العليان|السعودية|الجزائر|البحرين|الاردن|ارامكو|ابوظبي|קום|ישראל|հայ|қаз|укр|срб|сайт|рф|рус|орг|онлайн|москва|мон|мкд|ком|католик|ею|дети|бел|бг|ευ|ελ|zw|zuerich|zone|zm|zip|zero|zara|zappos|za|yun|yt|youtube|you|yokohama|yoga|yodobashi|ye|yandex|yamaxun|yahoo|yachts|xyz|xxx|xin|xihuan|xerox|xbox|wtf|wtc|ws|wow|world|works|work|woodside|wolterskluwer|wme|winners|wine|windows|win|williamhill|wiki|wien|whoswho|wf|weir|weibo|wedding|wed|website|weber|webcam|weatherchannel|weather|watches|watch|wanggou|wang|walter|walmart|wales|vu|voyage|voto|voting|vote|volvo|vodka|vn|vlaanderen|vivo|viva|vision|visa|virgin|vip|vin|villas|viking|vig|video|viajes|vi|vg|vet|versicherung|vermögensberatung|vermögensberater|verisign|ventures|vegas|ve|vc|vanguard|vana|vacations|va|uz|uy|us|ups|uol|uno|university|unicom|uk|ug|ubs|ubank|ua|tz|tw|tvs|tv|tushu|tunes|tui|tube|tt|trv|trust|travelersinsurance|travelers|travel|training|trading|trade|tr|toys|toyota|town|tours|total|toshiba|toray|top|tools|tokyo|today|to|tn|tmall|tm|tl|tkmaxx|tk|tjx|tjmaxx|tj|tirol|tires|tips|tienda|tickets|tiaa|theatre|theater|thd|th|tg|tf|teva|tennis|temasek|tel|technology|tech|team|tdk|td|tci|tc|taxi|tax|tattoo|tatar|tatamotors|target|taobao|talk|taipei|tab|sz|systems|sydney|sy|sx|swiss|swatch|sv|suzuki|surgery|surf|support|supply|supplies|sucks|su|style|study|studio|stream|store|storage|stockholm|stcgroup|stc|statefarm|statebank|star|staples|stada|st|ss|srl|sr|spot|sport|space|spa|soy|sony|song|solutions|solar|sohu|software|softbank|social|soccer|so|sncf|sn|smile|smart|sm|sling|sl|skype|sky|skin|ski|sk|sj|site|singles|sina|silk|si|show|shouji|shopping|shop|shoes|shiksha|shia|shell|sharp|shangrila|sh|sg|sfr|sexy|sex|sew|seven|services|sener|select|seek|security|secure|seat|search|se|sd|scot|science|schwarz|schule|school|scholarships|schmidt|schaeffler|scb|sc|sbs|sbi|sb|saxo|save|sas|sarl|sap|sanofi|sandvikcoromant|sandvik|samsung|samsclub|salon|sale|sakura|safety|safe|saarland|sa|ryukyu|rwe|rw|run|ruhr|rugby|ru|rsvp|rs|room|rogers|rodeo|rocks|ro|rip|rio|ril|ricoh|richardli|rich|rexroth|reviews|review|restaurant|rest|republican|report|repair|rentals|rent|ren|reliance|reit|reisen|reise|rehab|redumbrella|red|recipes|realty|realtor|realestate|read|re|radio|racing|quest|quebec|qpon|qa|py|pwc|pw|pub|pt|ps|prudential|pru|protection|property|properties|promo|progressive|prof|productions|prod|pro|prime|press|praxi|pr|post|porn|politie|poker|pohl|pnc|pn|pm|plus|plumbing|playstation|play|place|pl|pk|pizza|pioneer|pink|ping|pin|pid|pictures|pictet|pics|physio|photos|photography|photo|phone|philips|phd|pharmacy|ph|pg|pfizer|pf|pet|pe|pccw|pay|party|parts|partners|pars|paris|panasonic|page|pa|ovh|ott|otsuka|osaka|origins|organic|org|orange|oracle|open|ooo|online|onl|onion|ong|one|omega|om|ollo|olayangroup|olayan|okinawa|office|observer|obi|nz|nyc|nu|ntt|nrw|nra|nr|np|nowtv|nowruz|now|norton|nokia|no|nl|nissay|nissan|ninja|nikon|nike|nico|ni|nhk|ngo|ng|nfl|nf|nexus|nextdirect|next|news|new|neustar|network|netflix|netbank|net|nec|ne|nc|nba|navy|name|nagoya|nab|na|mz|my|mx|mw|mv|music|museum|mu|mtr|mtn|mt|msd|ms|mr|mq|mp|movie|mov|motorcycles|moto|moscow|mortgage|mormon|monster|money|monash|mom|moi|moe|moda|mobile|mobi|mo|mn|mma|mm|mls|mlb|ml|mk|mitsubishi|mit|mint|mini|mil|microsoft|miami|mh|mg|merckmsd|menu|men|memorial|meme|melbourne|meet|media|med|me|md|mckinsey|mc|mba|mattel|marshalls|marriott|markets|marketing|market|map|mango|management|man|makeup|maison|maif|madrid|ma|ly|lv|luxury|luxe|lundbeck|lu|ltda|ltd|lt|ls|lr|lplfinancial|lpl|love|lotto|lotte|london|lol|locus|locker|loans|loan|llp|llc|lk|living|live|link|lincoln|limo|limited|lilly|like|lighting|lifestyle|lifeinsurance|life|lidl|li|lgbt|lexus|lego|legal|lefrak|leclerc|lease|lds|lc|lb|lawyer|law|latrobe|latino|lat|lasalle|lanxess|landrover|land|lamer|lamborghini|lacaixa|la|kz|kyoto|ky|kw|kuokgroup|kred|krd|kr|kpn|kpmg|kp|kosher|komatsu|koeln|kn|km|kiwi|kitchen|kindle|kim|kids|kia|ki|kh|kg|kfh|kerryproperties|kerryhotels|ke|kddi|kaufen|juniper|juegos|jprs|jpmorgan|jp|joy|jot|joburg|jobs|jo|jnj|jmp|jm|jll|jio|jewelry|jetzt|jeep|je|jcb|java|jaguar|itv|itau|it|istanbul|ist|ismaili|is|irish|ir|iq|ipiranga|io|investments|intuit|international|int|insure|insurance|institute|ink|ing|info|infiniti|industries|inc|in|immobilien|immo|imdb|imamat|im|il|ikano|ifm|ieee|ie|id|icu|ice|icbc|ibm|hyundai|hyatt|hughes|hu|ht|hsbc|hr|how|house|hotmail|hotels|hot|hosting|host|hospital|horse|honda|homesense|homes|homegoods|homedepot|holiday|holdings|hockey|hn|hm|hkt|hk|hiv|hitachi|hisamitsu|hiphop|hermes|here|helsinki|help|healthcare|health|hdfcbank|hdfc|hbo|haus|hangout|hamburg|hair|gy|gw|guru|guitars|guide|guge|gucci|gu|gt|gs|group|grocery|gripe|green|gratis|graphics|grainger|gr|gq|gp|gov|got|gop|google|goog|goodyear|goo|golf|goldpoint|gold|godaddy|gn|gmx|gmo|gmbh|gmail|gm|globo|global|gle|glass|gl|giving|gives|gifts|gift|gi|gh|ggee|gg|gf|george|genting|gent|gea|ge|gdn|gd|gbiz|gb|gay|garden|gap|games|game|gallup|gallo|gallery|gal|ga|fyi|futbol|furniture|fund|fun|fujitsu|ftr|frontier|frogans|frl|fresenius|free|fr|fox|foundation|forum|forsale|forex|ford|football|food|foo|fo|fm|fly|flowers|florist|flir|flights|flickr|fk|fj|fitness|fit|fishing|fish|firmdale|firestone|fire|financial|finance|final|film|fido|fidelity|fi|ferrero|ferrari|feedback|fedex|fast|fashion|farmers|farm|fans|fan|family|faith|fairwinds|fail|fage|extraspace|express|exposed|expert|exchange|events|eus|eurovision|eu|et|estate|esq|es|erni|ericsson|er|equipment|epson|enterprises|engineering|engineer|energy|emerck|email|eg|ee|education|edu|edeka|eco|ec|eat|earth|dz|dvr|dvag|durban|dupont|dubai|dtv|drive|download|dot|domains|dog|doctor|docs|do|dnp|dm|dk|dj|diy|dish|discover|discount|directory|direct|digital|diet|diamonds|dhl|dev|design|desi|dentist|dental|democrat|delta|deloitte|dell|delivery|degree|deals|dealer|deal|de|dds|dclk|day|datsun|dating|date|data|dance|dad|cz|cyou|cymru|cy|cx|cw|cv|cuisinella|cu|cruises|cruise|crs|crown|cricket|creditunion|creditcard|credit|cr|cpa|courses|coupons|coupon|country|corsica|coop|cool|cooking|contractors|contact|consulting|construction|condos|comsec|computer|compare|company|community|commbank|com|cologne|college|coffee|codes|coach|co|cn|cm|clubmed|club|cloud|clothing|clinique|clinic|click|cleaning|claims|cl|ck|city|citic|citi|citadel|cisco|circle|cipriani|ci|church|chrome|christmas|chintai|cheap|chat|chase|charity|channel|chanel|ch|cg|cfd|cfa|cf|cern|ceo|center|cd|cc|cbre|cbn|cba|catholic|catering|cat|casino|cash|case|casa|cars|careers|career|care|cards|caravan|car|capitalone|capital|capetown|canon|camp|camera|cam|calvinklein|call|cal|cafe|cab|ca|bzh|bz|by|bw|bv|buzz|buy|business|builders|build|bt|bs|brussels|brother|broker|broadway|bridgestone|bradesco|br|box|boutique|bot|boston|bostik|bosch|booking|book|boo|bond|bom|bofa|boehringer|boats|bo|bnpparibas|bn|bmw|bms|bm|blue|bloomberg|blog|blockbuster|blackfriday|black|bj|biz|bio|bingo|bing|bike|bid|bible|bi|bharti|bh|bg|bf|bet|bestbuy|best|berlin|beer|beauty|beats|be|bd|bcn|bcg|bbva|bbt|bbc|bb|bayern|bauhaus|basketball|baseball|bargains|barefoot|barclays|barclaycard|barcelona|bar|bank|band|banamex|baidu|baby|ba|azure|az|axa|ax|aws|aw|autos|auto|author|auspost|audio|audible|audi|auction|au|attorney|athleta|at|associates|asia|asda|as|arte|art|arpa|army|archi|aramco|arab|ar|aquarelle|aq|apple|app|apartments|aol|ao|anz|anquan|android|analytics|amsterdam|amica|amfam|amex|americanfamily|americanexpress|amazon|am|alstom|alsace|ally|allstate|allfinanz|alipay|alibaba|al|akdn|airtel|airforce|airbus|aig|ai|agency|agakhan|ag|africa|afl|af|aetna|aero|aeg|ae|adult|ads|ad|actor|aco|accountants|accountant|accenture|academy|ac|abudhabi|abogado|able|abc|abbvie|abbott|abb|aarp|aaa|xn--[a-z0-9\\-]{1,59}';
const HE_NAMES =
	'\u0001<⃒\u0002nvlt\u0001=⃥\u0002bne\u0001>⃒\u0002nvgt\u0001 \u0002nbsp\u0001¡\u0002iexcl\u0001¢\u0002cent\u0001£\u0002pound\u0001¤\u0002curren\u0001¥\u0002yen\u0001¦\u0002brvbar\u0001§\u0002sect\u0001¨\u0002die\u0001©\u0002copy\u0001ª\u0002ordf\u0001«\u0002laquo\u0001¬\u0002not\u0001­\u0002shy\u0001®\u0002reg\u0001¯\u0002macr\u0001°\u0002deg\u0001±\u0002pm\u0001²\u0002sup2\u0001³\u0002sup3\u0001´\u0002acute\u0001µ\u0002micro\u0001¶\u0002para\u0001·\u0002middot\u0001¸\u0002cedil\u0001¹\u0002sup1\u0001º\u0002ordm\u0001»\u0002raquo\u0001¼\u0002frac14\u0001½\u0002half\u0001¾\u0002frac34\u0001¿\u0002iquest\u0001À\u0002Agrave\u0001Á\u0002Aacute\u0001Â\u0002Acirc\u0001Ã\u0002Atilde\u0001Ä\u0002Auml\u0001Å\u0002angst\u0001Æ\u0002AElig\u0001Ç\u0002Ccedil\u0001È\u0002Egrave\u0001É\u0002Eacute\u0001Ê\u0002Ecirc\u0001Ë\u0002Euml\u0001Ì\u0002Igrave\u0001Í\u0002Iacute\u0001Î\u0002Icirc\u0001Ï\u0002Iuml\u0001Ð\u0002ETH\u0001Ñ\u0002Ntilde\u0001Ò\u0002Ograve\u0001Ó\u0002Oacute\u0001Ô\u0002Ocirc\u0001Õ\u0002Otilde\u0001Ö\u0002Ouml\u0001×\u0002times\u0001Ø\u0002Oslash\u0001Ù\u0002Ugrave\u0001Ú\u0002Uacute\u0001Û\u0002Ucirc\u0001Ü\u0002Uuml\u0001Ý\u0002Yacute\u0001Þ\u0002THORN\u0001ß\u0002szlig\u0001à\u0002agrave\u0001á\u0002aacute\u0001â\u0002acirc\u0001ã\u0002atilde\u0001ä\u0002auml\u0001å\u0002aring\u0001æ\u0002aelig\u0001ç\u0002ccedil\u0001è\u0002egrave\u0001é\u0002eacute\u0001ê\u0002ecirc\u0001ë\u0002euml\u0001ì\u0002igrave\u0001í\u0002iacute\u0001î\u0002icirc\u0001ï\u0002iuml\u0001ð\u0002eth\u0001ñ\u0002ntilde\u0001ò\u0002ograve\u0001ó\u0002oacute\u0001ô\u0002ocirc\u0001õ\u0002otilde\u0001ö\u0002ouml\u0001÷\u0002div\u0001ø\u0002oslash\u0001ù\u0002ugrave\u0001ú\u0002uacute\u0001û\u0002ucirc\u0001ü\u0002uuml\u0001ý\u0002yacute\u0001þ\u0002thorn\u0001ÿ\u0002yuml\u0001Ā\u0002Amacr\u0001ā\u0002amacr\u0001Ă\u0002Abreve\u0001ă\u0002abreve\u0001Ą\u0002Aogon\u0001ą\u0002aogon\u0001Ć\u0002Cacute\u0001ć\u0002cacute\u0001Ĉ\u0002Ccirc\u0001ĉ\u0002ccirc\u0001Ċ\u0002Cdot\u0001ċ\u0002cdot\u0001Č\u0002Ccaron\u0001č\u0002ccaron\u0001Ď\u0002Dcaron\u0001ď\u0002dcaron\u0001Đ\u0002Dstrok\u0001đ\u0002dstrok\u0001Ē\u0002Emacr\u0001ē\u0002emacr\u0001Ė\u0002Edot\u0001ė\u0002edot\u0001Ę\u0002Eogon\u0001ę\u0002eogon\u0001Ě\u0002Ecaron\u0001ě\u0002ecaron\u0001Ĝ\u0002Gcirc\u0001ĝ\u0002gcirc\u0001Ğ\u0002Gbreve\u0001ğ\u0002gbreve\u0001Ġ\u0002Gdot\u0001ġ\u0002gdot\u0001Ģ\u0002Gcedil\u0001Ĥ\u0002Hcirc\u0001ĥ\u0002hcirc\u0001Ħ\u0002Hstrok\u0001ħ\u0002hstrok\u0001Ĩ\u0002Itilde\u0001ĩ\u0002itilde\u0001Ī\u0002Imacr\u0001ī\u0002imacr\u0001Į\u0002Iogon\u0001į\u0002iogon\u0001İ\u0002Idot\u0001ı\u0002imath\u0001Ĳ\u0002IJlig\u0001ĳ\u0002ijlig\u0001Ĵ\u0002Jcirc\u0001ĵ\u0002jcirc\u0001Ķ\u0002Kcedil\u0001ķ\u0002kcedil\u0001ĸ\u0002kgreen\u0001Ĺ\u0002Lacute\u0001ĺ\u0002lacute\u0001Ļ\u0002Lcedil\u0001ļ\u0002lcedil\u0001Ľ\u0002Lcaron\u0001ľ\u0002lcaron\u0001Ŀ\u0002Lmidot\u0001ŀ\u0002lmidot\u0001Ł\u0002Lstrok\u0001ł\u0002lstrok\u0001Ń\u0002Nacute\u0001ń\u0002nacute\u0001Ņ\u0002Ncedil\u0001ņ\u0002ncedil\u0001Ň\u0002Ncaron\u0001ň\u0002ncaron\u0001ŉ\u0002napos\u0001Ŋ\u0002ENG\u0001ŋ\u0002eng\u0001Ō\u0002Omacr\u0001ō\u0002omacr\u0001Ő\u0002Odblac\u0001ő\u0002odblac\u0001Œ\u0002OElig\u0001œ\u0002oelig\u0001Ŕ\u0002Racute\u0001ŕ\u0002racute\u0001Ŗ\u0002Rcedil\u0001ŗ\u0002rcedil\u0001Ř\u0002Rcaron\u0001ř\u0002rcaron\u0001Ś\u0002Sacute\u0001ś\u0002sacute\u0001Ŝ\u0002Scirc\u0001ŝ\u0002scirc\u0001Ş\u0002Scedil\u0001ş\u0002scedil\u0001Š\u0002Scaron\u0001š\u0002scaron\u0001Ţ\u0002Tcedil\u0001ţ\u0002tcedil\u0001Ť\u0002Tcaron\u0001ť\u0002tcaron\u0001Ŧ\u0002Tstrok\u0001ŧ\u0002tstrok\u0001Ũ\u0002Utilde\u0001ũ\u0002utilde\u0001Ū\u0002Umacr\u0001ū\u0002umacr\u0001Ŭ\u0002Ubreve\u0001ŭ\u0002ubreve\u0001Ů\u0002Uring\u0001ů\u0002uring\u0001Ű\u0002Udblac\u0001ű\u0002udblac\u0001Ų\u0002Uogon\u0001ų\u0002uogon\u0001Ŵ\u0002Wcirc\u0001ŵ\u0002wcirc\u0001Ŷ\u0002Ycirc\u0001ŷ\u0002ycirc\u0001Ÿ\u0002Yuml\u0001Ź\u0002Zacute\u0001ź\u0002zacute\u0001Ż\u0002Zdot\u0001ż\u0002zdot\u0001Ž\u0002Zcaron\u0001ž\u0002zcaron\u0001ƒ\u0002fnof\u0001Ƶ\u0002imped\u0001ǵ\u0002gacute\u0001ȷ\u0002jmath\u0001ˆ\u0002circ\u0001ˇ\u0002caron\u0001˘\u0002breve\u0001˙\u0002dot\u0001˚\u0002ring\u0001˛\u0002ogon\u0001˜\u0002tilde\u0001˝\u0002dblac\u0001̑\u0002DownBreve\u0001Α\u0002Alpha\u0001Β\u0002Beta\u0001Γ\u0002Gamma\u0001Δ\u0002Delta\u0001Ε\u0002Epsilon\u0001Ζ\u0002Zeta\u0001Η\u0002Eta\u0001Θ\u0002Theta\u0001Ι\u0002Iota\u0001Κ\u0002Kappa\u0001Λ\u0002Lambda\u0001Μ\u0002Mu\u0001Ν\u0002Nu\u0001Ξ\u0002Xi\u0001Ο\u0002Omicron\u0001Π\u0002Pi\u0001Ρ\u0002Rho\u0001Σ\u0002Sigma\u0001Τ\u0002Tau\u0001Υ\u0002Upsilon\u0001Φ\u0002Phi\u0001Χ\u0002Chi\u0001Ψ\u0002Psi\u0001Ω\u0002ohm\u0001α\u0002alpha\u0001β\u0002beta\u0001γ\u0002gamma\u0001δ\u0002delta\u0001ε\u0002epsi\u0001ζ\u0002zeta\u0001η\u0002eta\u0001θ\u0002theta\u0001ι\u0002iota\u0001κ\u0002kappa\u0001λ\u0002lambda\u0001μ\u0002mu\u0001ν\u0002nu\u0001ξ\u0002xi\u0001ο\u0002omicron\u0001π\u0002pi\u0001ρ\u0002rho\u0001ς\u0002sigmaf\u0001σ\u0002sigma\u0001τ\u0002tau\u0001υ\u0002upsi\u0001φ\u0002phi\u0001χ\u0002chi\u0001ψ\u0002psi\u0001ω\u0002omega\u0001ϑ\u0002thetav\u0001ϒ\u0002Upsi\u0001ϕ\u0002phiv\u0001ϖ\u0002piv\u0001Ϝ\u0002Gammad\u0001ϝ\u0002gammad\u0001ϰ\u0002kappav\u0001ϱ\u0002rhov\u0001ϵ\u0002epsiv\u0001϶\u0002bepsi\u0001Ё\u0002IOcy\u0001Ђ\u0002DJcy\u0001Ѓ\u0002GJcy\u0001Є\u0002Jukcy\u0001Ѕ\u0002DScy\u0001І\u0002Iukcy\u0001Ї\u0002YIcy\u0001Ј\u0002Jsercy\u0001Љ\u0002LJcy\u0001Њ\u0002NJcy\u0001Ћ\u0002TSHcy\u0001Ќ\u0002KJcy\u0001Ў\u0002Ubrcy\u0001Џ\u0002DZcy\u0001А\u0002Acy\u0001Б\u0002Bcy\u0001В\u0002Vcy\u0001Г\u0002Gcy\u0001Д\u0002Dcy\u0001Е\u0002IEcy\u0001Ж\u0002ZHcy\u0001З\u0002Zcy\u0001И\u0002Icy\u0001Й\u0002Jcy\u0001К\u0002Kcy\u0001Л\u0002Lcy\u0001М\u0002Mcy\u0001Н\u0002Ncy\u0001О\u0002Ocy\u0001П\u0002Pcy\u0001Р\u0002Rcy\u0001С\u0002Scy\u0001Т\u0002Tcy\u0001У\u0002Ucy\u0001Ф\u0002Fcy\u0001Х\u0002KHcy\u0001Ц\u0002TScy\u0001Ч\u0002CHcy\u0001Ш\u0002SHcy\u0001Щ\u0002SHCHcy\u0001Ъ\u0002HARDcy\u0001Ы\u0002Ycy\u0001Ь\u0002SOFTcy\u0001Э\u0002Ecy\u0001Ю\u0002YUcy\u0001Я\u0002YAcy\u0001а\u0002acy\u0001б\u0002bcy\u0001в\u0002vcy\u0001г\u0002gcy\u0001д\u0002dcy\u0001е\u0002iecy\u0001ж\u0002zhcy\u0001з\u0002zcy\u0001и\u0002icy\u0001й\u0002jcy\u0001к\u0002kcy\u0001л\u0002lcy\u0001м\u0002mcy\u0001н\u0002ncy\u0001о\u0002ocy\u0001п\u0002pcy\u0001р\u0002rcy\u0001с\u0002scy\u0001т\u0002tcy\u0001у\u0002ucy\u0001ф\u0002fcy\u0001х\u0002khcy\u0001ц\u0002tscy\u0001ч\u0002chcy\u0001ш\u0002shcy\u0001щ\u0002shchcy\u0001ъ\u0002hardcy\u0001ы\u0002ycy\u0001ь\u0002softcy\u0001э\u0002ecy\u0001ю\u0002yucy\u0001я\u0002yacy\u0001ё\u0002iocy\u0001ђ\u0002djcy\u0001ѓ\u0002gjcy\u0001є\u0002jukcy\u0001ѕ\u0002dscy\u0001і\u0002iukcy\u0001ї\u0002yicy\u0001ј\u0002jsercy\u0001љ\u0002ljcy\u0001њ\u0002njcy\u0001ћ\u0002tshcy\u0001ќ\u0002kjcy\u0001ў\u0002ubrcy\u0001џ\u0002dzcy\u0001 \u0002ensp\u0001 \u0002emsp\u0001 \u0002emsp13\u0001 \u0002emsp14\u0001 \u0002numsp\u0001 \u0002puncsp\u0001 \u0002thinsp\u0001 \u0002hairsp\u0001​\u0002ZeroWidthSpace\u0001‌\u0002zwnj\u0001‍\u0002zwj\u0001‎\u0002lrm\u0001‏\u0002rlm\u0001‐\u0002dash\u0001–\u0002ndash\u0001—\u0002mdash\u0001―\u0002horbar\u0001‖\u0002Vert\u0001‘\u0002lsquo\u0001’\u0002rsquo\u0001‚\u0002sbquo\u0001“\u0002ldquo\u0001”\u0002rdquo\u0001„\u0002bdquo\u0001†\u0002dagger\u0001‡\u0002Dagger\u0001•\u0002bull\u0001‥\u0002nldr\u0001…\u0002mldr\u0001‰\u0002permil\u0001‱\u0002pertenk\u0001′\u0002prime\u0001″\u0002Prime\u0001‴\u0002tprime\u0001‵\u0002bprime\u0001‹\u0002lsaquo\u0001›\u0002rsaquo\u0001‾\u0002oline\u0001⁁\u0002caret\u0001⁃\u0002hybull\u0001⁄\u0002frasl\u0001⁏\u0002bsemi\u0001⁗\u0002qprime\u0001 \u0002MediumSpace\u0001  \u0002ThickSpace\u0001⁠\u0002NoBreak\u0001⁡\u0002af\u0001⁢\u0002it\u0001⁣\u0002ic\u0001€\u0002euro\u0001⃛\u0002tdot\u0001⃜\u0002DotDot\u0001ℂ\u0002Copf\u0001℅\u0002incare\u0001ℊ\u0002gscr\u0001ℋ\u0002Hscr\u0001ℌ\u0002Hfr\u0001ℍ\u0002Hopf\u0001ℎ\u0002planckh\u0001ℏ\u0002hbar\u0001ℐ\u0002Iscr\u0001ℑ\u0002Im\u0001ℒ\u0002Lscr\u0001ℓ\u0002ell\u0001ℕ\u0002Nopf\u0001№\u0002numero\u0001℗\u0002copysr\u0001℘\u0002wp\u0001ℙ\u0002Popf\u0001ℚ\u0002Qopf\u0001ℛ\u0002Rscr\u0001ℜ\u0002Re\u0001ℝ\u0002Ropf\u0001℞\u0002rx\u0001™\u0002trade\u0001ℤ\u0002Zopf\u0001℧\u0002mho\u0001ℨ\u0002Zfr\u0001℩\u0002iiota\u0001ℬ\u0002Bscr\u0001ℭ\u0002Cfr\u0001ℯ\u0002escr\u0001ℰ\u0002Escr\u0001ℱ\u0002Fscr\u0001ℳ\u0002Mscr\u0001ℴ\u0002oscr\u0001ℵ\u0002aleph\u0001ℶ\u0002beth\u0001ℷ\u0002gimel\u0001ℸ\u0002daleth\u0001ⅅ\u0002DD\u0001ⅆ\u0002dd\u0001ⅇ\u0002ee\u0001ⅈ\u0002ii\u0001⅓\u0002frac13\u0001⅔\u0002frac23\u0001⅕\u0002frac15\u0001⅖\u0002frac25\u0001⅗\u0002frac35\u0001⅘\u0002frac45\u0001⅙\u0002frac16\u0001⅚\u0002frac56\u0001⅛\u0002frac18\u0001⅜\u0002frac38\u0001⅝\u0002frac58\u0001⅞\u0002frac78\u0001←\u0002larr\u0001↑\u0002uarr\u0001→\u0002rarr\u0001↓\u0002darr\u0001↔\u0002harr\u0001↕\u0002varr\u0001↖\u0002nwarr\u0001↗\u0002nearr\u0001↘\u0002searr\u0001↙\u0002swarr\u0001↚\u0002nlarr\u0001↛\u0002nrarr\u0001↝\u0002rarrw\u0001↝̸\u0002nrarrw\u0001↞\u0002Larr\u0001↟\u0002Uarr\u0001↠\u0002Rarr\u0001↡\u0002Darr\u0001↢\u0002larrtl\u0001↣\u0002rarrtl\u0001↤\u0002mapstoleft\u0001↥\u0002mapstoup\u0001↦\u0002map\u0001↧\u0002mapstodown\u0001↩\u0002larrhk\u0001↪\u0002rarrhk\u0001↫\u0002larrlp\u0001↬\u0002rarrlp\u0001↭\u0002harrw\u0001↮\u0002nharr\u0001↰\u0002lsh\u0001↱\u0002rsh\u0001↲\u0002ldsh\u0001↳\u0002rdsh\u0001↵\u0002crarr\u0001↶\u0002cularr\u0001↷\u0002curarr\u0001↺\u0002olarr\u0001↻\u0002orarr\u0001↼\u0002lharu\u0001↽\u0002lhard\u0001↾\u0002uharr\u0001↿\u0002uharl\u0001⇀\u0002rharu\u0001⇁\u0002rhard\u0001⇂\u0002dharr\u0001⇃\u0002dharl\u0001⇄\u0002rlarr\u0001⇅\u0002udarr\u0001⇆\u0002lrarr\u0001⇇\u0002llarr\u0001⇈\u0002uuarr\u0001⇉\u0002rrarr\u0001⇊\u0002ddarr\u0001⇋\u0002lrhar\u0001⇌\u0002rlhar\u0001⇍\u0002nlArr\u0001⇎\u0002nhArr\u0001⇏\u0002nrArr\u0001⇐\u0002lArr\u0001⇑\u0002uArr\u0001⇒\u0002rArr\u0001⇓\u0002dArr\u0001⇔\u0002iff\u0001⇕\u0002vArr\u0001⇖\u0002nwArr\u0001⇗\u0002neArr\u0001⇘\u0002seArr\u0001⇙\u0002swArr\u0001⇚\u0002lAarr\u0001⇛\u0002rAarr\u0001⇝\u0002zigrarr\u0001⇤\u0002larrb\u0001⇥\u0002rarrb\u0001⇵\u0002duarr\u0001⇽\u0002loarr\u0001⇾\u0002roarr\u0001⇿\u0002hoarr\u0001∀\u0002forall\u0001∁\u0002comp\u0001∂\u0002part\u0001∂̸\u0002npart\u0001∃\u0002exist\u0001∄\u0002nexist\u0001∅\u0002empty\u0001∇\u0002Del\u0001∈\u0002in\u0001∉\u0002notin\u0001∋\u0002ni\u0001∌\u0002notni\u0001∏\u0002prod\u0001∐\u0002coprod\u0001∑\u0002sum\u0001−\u0002minus\u0001∓\u0002mp\u0001∔\u0002plusdo\u0001∖\u0002setmn\u0001∗\u0002lowast\u0001∘\u0002compfn\u0001√\u0002Sqrt\u0001∝\u0002prop\u0001∞\u0002infin\u0001∟\u0002angrt\u0001∠\u0002ang\u0001∠⃒\u0002nang\u0001∡\u0002angmsd\u0001∢\u0002angsph\u0001∣\u0002mid\u0001∤\u0002nmid\u0001∥\u0002par\u0001∦\u0002npar\u0001∧\u0002and\u0001∨\u0002or\u0001∩\u0002cap\u0001∩︀\u0002caps\u0001∪\u0002cup\u0001∪︀\u0002cups\u0001∫\u0002int\u0001∬\u0002Int\u0001∭\u0002tint\u0001∮\u0002oint\u0001∯\u0002Conint\u0001∰\u0002Cconint\u0001∱\u0002cwint\u0001∲\u0002cwconint\u0001∳\u0002awconint\u0001∴\u0002there4\u0001∵\u0002becaus\u0001∶\u0002ratio\u0001∷\u0002Colon\u0001∸\u0002minusd\u0001∺\u0002mDDot\u0001∻\u0002homtht\u0001∼\u0002sim\u0001∼⃒\u0002nvsim\u0001∽\u0002bsim\u0001∽̱\u0002race\u0001∾\u0002ac\u0001∾̳\u0002acE\u0001∿\u0002acd\u0001≀\u0002wr\u0001≁\u0002nsim\u0001≂\u0002esim\u0001≂̸\u0002nesim\u0001≃\u0002sime\u0001≄\u0002nsime\u0001≅\u0002cong\u0001≆\u0002simne\u0001≇\u0002ncong\u0001≈\u0002ap\u0001≉\u0002nap\u0001≊\u0002ape\u0001≋\u0002apid\u0001≋̸\u0002napid\u0001≌\u0002bcong\u0001≍\u0002CupCap\u0001≍⃒\u0002nvap\u0001≎\u0002bump\u0001≎̸\u0002nbump\u0001≏\u0002bumpe\u0001≏̸\u0002nbumpe\u0001≐\u0002doteq\u0001≐̸\u0002nedot\u0001≑\u0002eDot\u0001≒\u0002efDot\u0001≓\u0002erDot\u0001≔\u0002colone\u0001≕\u0002ecolon\u0001≖\u0002ecir\u0001≗\u0002cire\u0001≙\u0002wedgeq\u0001≚\u0002veeeq\u0001≜\u0002trie\u0001≟\u0002equest\u0001≠\u0002ne\u0001≡\u0002equiv\u0001≡⃥\u0002bnequiv\u0001≢\u0002nequiv\u0001≤\u0002le\u0001≤⃒\u0002nvle\u0001≥\u0002ge\u0001≥⃒\u0002nvge\u0001≦\u0002lE\u0001≦̸\u0002nlE\u0001≧\u0002gE\u0001≧̸\u0002ngE\u0001≨\u0002lnE\u0001≨︀\u0002lvnE\u0001≩\u0002gnE\u0001≩︀\u0002gvnE\u0001≪\u0002ll\u0001≪̸\u0002nLtv\u0001≪⃒\u0002nLt\u0001≫\u0002gg\u0001≫̸\u0002nGtv\u0001≫⃒\u0002nGt\u0001≬\u0002twixt\u0001≭\u0002NotCupCap\u0001≮\u0002nlt\u0001≯\u0002ngt\u0001≰\u0002nle\u0001≱\u0002nge\u0001≲\u0002lsim\u0001≳\u0002gsim\u0001≴\u0002nlsim\u0001≵\u0002ngsim\u0001≶\u0002lg\u0001≷\u0002gl\u0001≸\u0002ntlg\u0001≹\u0002ntgl\u0001≺\u0002pr\u0001≻\u0002sc\u0001≼\u0002prcue\u0001≽\u0002sccue\u0001≾\u0002prsim\u0001≿\u0002scsim\u0001≿̸\u0002NotSucceedsTilde\u0001⊀\u0002npr\u0001⊁\u0002nsc\u0001⊂\u0002sub\u0001⊂⃒\u0002vnsub\u0001⊃\u0002sup\u0001⊃⃒\u0002vnsup\u0001⊄\u0002nsub\u0001⊅\u0002nsup\u0001⊆\u0002sube\u0001⊇\u0002supe\u0001⊈\u0002nsube\u0001⊉\u0002nsupe\u0001⊊\u0002subne\u0001⊊︀\u0002vsubne\u0001⊋\u0002supne\u0001⊋︀\u0002vsupne\u0001⊍\u0002cupdot\u0001⊎\u0002uplus\u0001⊏\u0002sqsub\u0001⊏̸\u0002NotSquareSubset\u0001⊐\u0002sqsup\u0001⊐̸\u0002NotSquareSuperset\u0001⊑\u0002sqsube\u0001⊒\u0002sqsupe\u0001⊓\u0002sqcap\u0001⊓︀\u0002sqcaps\u0001⊔\u0002sqcup\u0001⊔︀\u0002sqcups\u0001⊕\u0002oplus\u0001⊖\u0002ominus\u0001⊗\u0002otimes\u0001⊘\u0002osol\u0001⊙\u0002odot\u0001⊚\u0002ocir\u0001⊛\u0002oast\u0001⊝\u0002odash\u0001⊞\u0002plusb\u0001⊟\u0002minusb\u0001⊠\u0002timesb\u0001⊡\u0002sdotb\u0001⊢\u0002vdash\u0001⊣\u0002dashv\u0001⊤\u0002top\u0001⊥\u0002bot\u0001⊧\u0002models\u0001⊨\u0002vDash\u0001⊩\u0002Vdash\u0001⊪\u0002Vvdash\u0001⊫\u0002VDash\u0001⊬\u0002nvdash\u0001⊭\u0002nvDash\u0001⊮\u0002nVdash\u0001⊯\u0002nVDash\u0001⊰\u0002prurel\u0001⊲\u0002vltri\u0001⊳\u0002vrtri\u0001⊴\u0002ltrie\u0001⊴⃒\u0002nvltrie\u0001⊵\u0002rtrie\u0001⊵⃒\u0002nvrtrie\u0001⊶\u0002origof\u0001⊷\u0002imof\u0001⊸\u0002mumap\u0001⊹\u0002hercon\u0001⊺\u0002intcal\u0001⊻\u0002veebar\u0001⊽\u0002barvee\u0001⊾\u0002angrtvb\u0001⊿\u0002lrtri\u0001⋀\u0002Wedge\u0001⋁\u0002Vee\u0001⋂\u0002xcap\u0001⋃\u0002xcup\u0001⋄\u0002diam\u0001⋅\u0002sdot\u0001⋆\u0002Star\u0001⋇\u0002divonx\u0001⋈\u0002bowtie\u0001⋉\u0002ltimes\u0001⋊\u0002rtimes\u0001⋋\u0002lthree\u0001⋌\u0002rthree\u0001⋍\u0002bsime\u0001⋎\u0002cuvee\u0001⋏\u0002cuwed\u0001⋐\u0002Sub\u0001⋑\u0002Sup\u0001⋒\u0002Cap\u0001⋓\u0002Cup\u0001⋔\u0002fork\u0001⋕\u0002epar\u0001⋖\u0002ltdot\u0001⋗\u0002gtdot\u0001⋘\u0002Ll\u0001⋘̸\u0002nLl\u0001⋙\u0002Gg\u0001⋙̸\u0002nGg\u0001⋚\u0002leg\u0001⋚︀\u0002lesg\u0001⋛\u0002gel\u0001⋛︀\u0002gesl\u0001⋞\u0002cuepr\u0001⋟\u0002cuesc\u0001⋠\u0002nprcue\u0001⋡\u0002nsccue\u0001⋢\u0002nsqsube\u0001⋣\u0002nsqsupe\u0001⋦\u0002lnsim\u0001⋧\u0002gnsim\u0001⋨\u0002prnsim\u0001⋩\u0002scnsim\u0001⋪\u0002nltri\u0001⋫\u0002nrtri\u0001⋬\u0002nltrie\u0001⋭\u0002nrtrie\u0001⋮\u0002vellip\u0001⋯\u0002ctdot\u0001⋰\u0002utdot\u0001⋱\u0002dtdot\u0001⋲\u0002disin\u0001⋳\u0002isinsv\u0001⋴\u0002isins\u0001⋵\u0002isindot\u0001⋵̸\u0002notindot\u0001⋶\u0002notinvc\u0001⋷\u0002notinvb\u0001⋹\u0002isinE\u0001⋹̸\u0002notinE\u0001⋺\u0002nisd\u0001⋻\u0002xnis\u0001⋼\u0002nis\u0001⋽\u0002notnivc\u0001⋾\u0002notnivb\u0001⌅\u0002barwed\u0001⌆\u0002Barwed\u0001⌈\u0002lceil\u0001⌉\u0002rceil\u0001⌊\u0002lfloor\u0001⌋\u0002rfloor\u0001⌌\u0002drcrop\u0001⌍\u0002dlcrop\u0001⌎\u0002urcrop\u0001⌏\u0002ulcrop\u0001⌐\u0002bnot\u0001⌒\u0002profline\u0001⌓\u0002profsurf\u0001⌕\u0002telrec\u0001⌖\u0002target\u0001⌜\u0002ulcorn\u0001⌝\u0002urcorn\u0001⌞\u0002dlcorn\u0001⌟\u0002drcorn\u0001⌢\u0002frown\u0001⌣\u0002smile\u0001⌭\u0002cylcty\u0001⌮\u0002profalar\u0001⌶\u0002topbot\u0001⌽\u0002ovbar\u0001⌿\u0002solbar\u0001⍼\u0002angzarr\u0001⎰\u0002lmoust\u0001⎱\u0002rmoust\u0001⎴\u0002tbrk\u0001⎵\u0002bbrk\u0001⎶\u0002bbrktbrk\u0001⏜\u0002OverParenthesis\u0001⏝\u0002UnderParenthesis\u0001⏞\u0002OverBrace\u0001⏟\u0002UnderBrace\u0001⏢\u0002trpezium\u0001⏧\u0002elinters\u0001␣\u0002blank\u0001Ⓢ\u0002oS\u0001─\u0002boxh\u0001│\u0002boxv\u0001┌\u0002boxdr\u0001┐\u0002boxdl\u0001└\u0002boxur\u0001┘\u0002boxul\u0001├\u0002boxvr\u0001┤\u0002boxvl\u0001┬\u0002boxhd\u0001┴\u0002boxhu\u0001┼\u0002boxvh\u0001═\u0002boxH\u0001║\u0002boxV\u0001╒\u0002boxdR\u0001╓\u0002boxDr\u0001╔\u0002boxDR\u0001╕\u0002boxdL\u0001╖\u0002boxDl\u0001╗\u0002boxDL\u0001╘\u0002boxuR\u0001╙\u0002boxUr\u0001╚\u0002boxUR\u0001╛\u0002boxuL\u0001╜\u0002boxUl\u0001╝\u0002boxUL\u0001╞\u0002boxvR\u0001╟\u0002boxVr\u0001╠\u0002boxVR\u0001╡\u0002boxvL\u0001╢\u0002boxVl\u0001╣\u0002boxVL\u0001╤\u0002boxHd\u0001╥\u0002boxhD\u0001╦\u0002boxHD\u0001╧\u0002boxHu\u0001╨\u0002boxhU\u0001╩\u0002boxHU\u0001╪\u0002boxvH\u0001╫\u0002boxVh\u0001╬\u0002boxVH\u0001▀\u0002uhblk\u0001▄\u0002lhblk\u0001█\u0002block\u0001░\u0002blk14\u0001▒\u0002blk12\u0001▓\u0002blk34\u0001□\u0002squ\u0001▪\u0002squf\u0001▫\u0002EmptyVerySmallSquare\u0001▭\u0002rect\u0001▮\u0002marker\u0001▱\u0002fltns\u0001△\u0002xutri\u0001▴\u0002utrif\u0001▵\u0002utri\u0001▸\u0002rtrif\u0001▹\u0002rtri\u0001▽\u0002xdtri\u0001▾\u0002dtrif\u0001▿\u0002dtri\u0001◂\u0002ltrif\u0001◃\u0002ltri\u0001◊\u0002loz\u0001○\u0002cir\u0001◬\u0002tridot\u0001◯\u0002xcirc\u0001◸\u0002ultri\u0001◹\u0002urtri\u0001◺\u0002lltri\u0001◻\u0002EmptySmallSquare\u0001◼\u0002FilledSmallSquare\u0001★\u0002starf\u0001☆\u0002star\u0001☎\u0002phone\u0001♀\u0002female\u0001♂\u0002male\u0001♠\u0002spades\u0001♣\u0002clubs\u0001♥\u0002hearts\u0001♦\u0002diams\u0001♪\u0002sung\u0001♭\u0002flat\u0001♮\u0002natur\u0001♯\u0002sharp\u0001✓\u0002check\u0001✗\u0002cross\u0001✠\u0002malt\u0001✶\u0002sext\u0001❘\u0002VerticalSeparator\u0001❲\u0002lbbrk\u0001❳\u0002rbbrk\u0001⟈\u0002bsolhsub\u0001⟉\u0002suphsol\u0001⟦\u0002lobrk\u0001⟧\u0002robrk\u0001⟨\u0002lang\u0001⟩\u0002rang\u0001⟪\u0002Lang\u0001⟫\u0002Rang\u0001⟬\u0002loang\u0001⟭\u0002roang\u0001⟵\u0002xlarr\u0001⟶\u0002xrarr\u0001⟷\u0002xharr\u0001⟸\u0002xlArr\u0001⟹\u0002xrArr\u0001⟺\u0002xhArr\u0001⟼\u0002xmap\u0001⟿\u0002dzigrarr\u0001⤂\u0002nvlArr\u0001⤃\u0002nvrArr\u0001⤄\u0002nvHarr\u0001⤅\u0002Map\u0001⤌\u0002lbarr\u0001⤍\u0002rbarr\u0001⤎\u0002lBarr\u0001⤏\u0002rBarr\u0001⤐\u0002RBarr\u0001⤑\u0002DDotrahd\u0001⤒\u0002UpArrowBar\u0001⤓\u0002DownArrowBar\u0001⤖\u0002Rarrtl\u0001⤙\u0002latail\u0001⤚\u0002ratail\u0001⤛\u0002lAtail\u0001⤜\u0002rAtail\u0001⤝\u0002larrfs\u0001⤞\u0002rarrfs\u0001⤟\u0002larrbfs\u0001⤠\u0002rarrbfs\u0001⤣\u0002nwarhk\u0001⤤\u0002nearhk\u0001⤥\u0002searhk\u0001⤦\u0002swarhk\u0001⤧\u0002nwnear\u0001⤨\u0002toea\u0001⤩\u0002tosa\u0001⤪\u0002swnwar\u0001⤳\u0002rarrc\u0001⤳̸\u0002nrarrc\u0001⤵\u0002cudarrr\u0001⤶\u0002ldca\u0001⤷\u0002rdca\u0001⤸\u0002cudarrl\u0001⤹\u0002larrpl\u0001⤼\u0002curarrm\u0001⤽\u0002cularrp\u0001⥅\u0002rarrpl\u0001⥈\u0002harrcir\u0001⥉\u0002Uarrocir\u0001⥊\u0002lurdshar\u0001⥋\u0002ldrushar\u0001⥎\u0002LeftRightVector\u0001⥏\u0002RightUpDownVector\u0001⥐\u0002DownLeftRightVector\u0001⥑\u0002LeftUpDownVector\u0001⥒\u0002LeftVectorBar\u0001⥓\u0002RightVectorBar\u0001⥔\u0002RightUpVectorBar\u0001⥕\u0002RightDownVectorBar\u0001⥖\u0002DownLeftVectorBar\u0001⥗\u0002DownRightVectorBar\u0001⥘\u0002LeftUpVectorBar\u0001⥙\u0002LeftDownVectorBar\u0001⥚\u0002LeftTeeVector\u0001⥛\u0002RightTeeVector\u0001⥜\u0002RightUpTeeVector\u0001⥝\u0002RightDownTeeVector\u0001⥞\u0002DownLeftTeeVector\u0001⥟\u0002DownRightTeeVector\u0001⥠\u0002LeftUpTeeVector\u0001⥡\u0002LeftDownTeeVector\u0001⥢\u0002lHar\u0001⥣\u0002uHar\u0001⥤\u0002rHar\u0001⥥\u0002dHar\u0001⥦\u0002luruhar\u0001⥧\u0002ldrdhar\u0001⥨\u0002ruluhar\u0001⥩\u0002rdldhar\u0001⥪\u0002lharul\u0001⥫\u0002llhard\u0001⥬\u0002rharul\u0001⥭\u0002lrhard\u0001⥮\u0002udhar\u0001⥯\u0002duhar\u0001⥰\u0002RoundImplies\u0001⥱\u0002erarr\u0001⥲\u0002simrarr\u0001⥳\u0002larrsim\u0001⥴\u0002rarrsim\u0001⥵\u0002rarrap\u0001⥶\u0002ltlarr\u0001⥸\u0002gtrarr\u0001⥹\u0002subrarr\u0001⥻\u0002suplarr\u0001⥼\u0002lfisht\u0001⥽\u0002rfisht\u0001⥾\u0002ufisht\u0001⥿\u0002dfisht\u0001⦅\u0002lopar\u0001⦆\u0002ropar\u0001⦋\u0002lbrke\u0001⦌\u0002rbrke\u0001⦍\u0002lbrkslu\u0001⦎\u0002rbrksld\u0001⦏\u0002lbrksld\u0001⦐\u0002rbrkslu\u0001⦑\u0002langd\u0001⦒\u0002rangd\u0001⦓\u0002lparlt\u0001⦔\u0002rpargt\u0001⦕\u0002gtlPar\u0001⦖\u0002ltrPar\u0001⦚\u0002vzigzag\u0001⦜\u0002vangrt\u0001⦝\u0002angrtvbd\u0001⦤\u0002ange\u0001⦥\u0002range\u0001⦦\u0002dwangle\u0001⦧\u0002uwangle\u0001⦨\u0002angmsdaa\u0001⦩\u0002angmsdab\u0001⦪\u0002angmsdac\u0001⦫\u0002angmsdad\u0001⦬\u0002angmsdae\u0001⦭\u0002angmsdaf\u0001⦮\u0002angmsdag\u0001⦯\u0002angmsdah\u0001⦰\u0002bemptyv\u0001⦱\u0002demptyv\u0001⦲\u0002cemptyv\u0001⦳\u0002raemptyv\u0001⦴\u0002laemptyv\u0001⦵\u0002ohbar\u0001⦶\u0002omid\u0001⦷\u0002opar\u0001⦹\u0002operp\u0001⦻\u0002olcross\u0001⦼\u0002odsold\u0001⦾\u0002olcir\u0001⦿\u0002ofcir\u0001⧀\u0002olt\u0001⧁\u0002ogt\u0001⧂\u0002cirscir\u0001⧃\u0002cirE\u0001⧄\u0002solb\u0001⧅\u0002bsolb\u0001⧉\u0002boxbox\u0001⧍\u0002trisb\u0001⧎\u0002rtriltri\u0001⧏\u0002LeftTriangleBar\u0001⧏̸\u0002NotLeftTriangleBar\u0001⧐\u0002RightTriangleBar\u0001⧐̸\u0002NotRightTriangleBar\u0001⧜\u0002iinfin\u0001⧝\u0002infintie\u0001⧞\u0002nvinfin\u0001⧣\u0002eparsl\u0001⧤\u0002smeparsl\u0001⧥\u0002eqvparsl\u0001⧫\u0002lozf\u0001⧴\u0002RuleDelayed\u0001⧶\u0002dsol\u0001⨀\u0002xodot\u0001⨁\u0002xoplus\u0001⨂\u0002xotime\u0001⨄\u0002xuplus\u0001⨆\u0002xsqcup\u0001⨌\u0002qint\u0001⨍\u0002fpartint\u0001⨐\u0002cirfnint\u0001⨑\u0002awint\u0001⨒\u0002rppolint\u0001⨓\u0002scpolint\u0001⨔\u0002npolint\u0001⨕\u0002pointint\u0001⨖\u0002quatint\u0001⨗\u0002intlarhk\u0001⨢\u0002pluscir\u0001⨣\u0002plusacir\u0001⨤\u0002simplus\u0001⨥\u0002plusdu\u0001⨦\u0002plussim\u0001⨧\u0002plustwo\u0001⨩\u0002mcomma\u0001⨪\u0002minusdu\u0001⨭\u0002loplus\u0001⨮\u0002roplus\u0001⨯\u0002Cross\u0001⨰\u0002timesd\u0001⨱\u0002timesbar\u0001⨳\u0002smashp\u0001⨴\u0002lotimes\u0001⨵\u0002rotimes\u0001⨶\u0002otimesas\u0001⨷\u0002Otimes\u0001⨸\u0002odiv\u0001⨹\u0002triplus\u0001⨺\u0002triminus\u0001⨻\u0002tritime\u0001⨼\u0002iprod\u0001⨿\u0002amalg\u0001⩀\u0002capdot\u0001⩂\u0002ncup\u0001⩃\u0002ncap\u0001⩄\u0002capand\u0001⩅\u0002cupor\u0001⩆\u0002cupcap\u0001⩇\u0002capcup\u0001⩈\u0002cupbrcap\u0001⩉\u0002capbrcup\u0001⩊\u0002cupcup\u0001⩋\u0002capcap\u0001⩌\u0002ccups\u0001⩍\u0002ccaps\u0001⩐\u0002ccupssm\u0001⩓\u0002And\u0001⩔\u0002Or\u0001⩕\u0002andand\u0001⩖\u0002oror\u0001⩗\u0002orslope\u0001⩘\u0002andslope\u0001⩚\u0002andv\u0001⩛\u0002orv\u0001⩜\u0002andd\u0001⩝\u0002ord\u0001⩟\u0002wedbar\u0001⩦\u0002sdote\u0001⩪\u0002simdot\u0001⩭\u0002congdot\u0001⩭̸\u0002ncongdot\u0001⩮\u0002easter\u0001⩯\u0002apacir\u0001⩰\u0002apE\u0001⩰̸\u0002napE\u0001⩱\u0002eplus\u0001⩲\u0002pluse\u0001⩳\u0002Esim\u0001⩴\u0002Colone\u0001⩵\u0002Equal\u0001⩷\u0002eDDot\u0001⩸\u0002equivDD\u0001⩹\u0002ltcir\u0001⩺\u0002gtcir\u0001⩻\u0002ltquest\u0001⩼\u0002gtquest\u0001⩽\u0002les\u0001⩽̸\u0002nles\u0001⩾\u0002ges\u0001⩾̸\u0002nges\u0001⩿\u0002lesdot\u0001⪀\u0002gesdot\u0001⪁\u0002lesdoto\u0001⪂\u0002gesdoto\u0001⪃\u0002lesdotor\u0001⪄\u0002gesdotol\u0001⪅\u0002lap\u0001⪆\u0002gap\u0001⪇\u0002lne\u0001⪈\u0002gne\u0001⪉\u0002lnap\u0001⪊\u0002gnap\u0001⪋\u0002lEg\u0001⪌\u0002gEl\u0001⪍\u0002lsime\u0001⪎\u0002gsime\u0001⪏\u0002lsimg\u0001⪐\u0002gsiml\u0001⪑\u0002lgE\u0001⪒\u0002glE\u0001⪓\u0002lesges\u0001⪔\u0002gesles\u0001⪕\u0002els\u0001⪖\u0002egs\u0001⪗\u0002elsdot\u0001⪘\u0002egsdot\u0001⪙\u0002el\u0001⪚\u0002eg\u0001⪝\u0002siml\u0001⪞\u0002simg\u0001⪟\u0002simlE\u0001⪠\u0002simgE\u0001⪡\u0002LessLess\u0001⪡̸\u0002NotNestedLessLess\u0001⪢\u0002GreaterGreater\u0001⪢̸\u0002NotNestedGreaterGreater\u0001⪤\u0002glj\u0001⪥\u0002gla\u0001⪦\u0002ltcc\u0001⪧\u0002gtcc\u0001⪨\u0002lescc\u0001⪩\u0002gescc\u0001⪪\u0002smt\u0001⪫\u0002lat\u0001⪬\u0002smte\u0001⪬︀\u0002smtes\u0001⪭\u0002late\u0001⪭︀\u0002lates\u0001⪮\u0002bumpE\u0001⪯\u0002pre\u0001⪯̸\u0002npre\u0001⪰\u0002sce\u0001⪰̸\u0002nsce\u0001⪳\u0002prE\u0001⪴\u0002scE\u0001⪵\u0002prnE\u0001⪶\u0002scnE\u0001⪷\u0002prap\u0001⪸\u0002scap\u0001⪹\u0002prnap\u0001⪺\u0002scnap\u0001⪻\u0002Pr\u0001⪼\u0002Sc\u0001⪽\u0002subdot\u0001⪾\u0002supdot\u0001⪿\u0002subplus\u0001⫀\u0002supplus\u0001⫁\u0002submult\u0001⫂\u0002supmult\u0001⫃\u0002subedot\u0001⫄\u0002supedot\u0001⫅\u0002subE\u0001⫅̸\u0002nsubE\u0001⫆\u0002supE\u0001⫆̸\u0002nsupE\u0001⫇\u0002subsim\u0001⫈\u0002supsim\u0001⫋\u0002subnE\u0001⫋︀\u0002vsubnE\u0001⫌\u0002supnE\u0001⫌︀\u0002vsupnE\u0001⫏\u0002csub\u0001⫐\u0002csup\u0001⫑\u0002csube\u0001⫒\u0002csupe\u0001⫓\u0002subsup\u0001⫔\u0002supsub\u0001⫕\u0002subsub\u0001⫖\u0002supsup\u0001⫗\u0002suphsub\u0001⫘\u0002supdsub\u0001⫙\u0002forkv\u0001⫚\u0002topfork\u0001⫛\u0002mlcp\u0001⫤\u0002Dashv\u0001⫦\u0002Vdashl\u0001⫧\u0002Barv\u0001⫨\u0002vBar\u0001⫩\u0002vBarv\u0001⫫\u0002Vbar\u0001⫬\u0002Not\u0001⫭\u0002bNot\u0001⫮\u0002rnmid\u0001⫯\u0002cirmid\u0001⫰\u0002midcir\u0001⫱\u0002topcir\u0001⫲\u0002nhpar\u0001⫳\u0002parsim\u0001⫽\u0002parsl\u0001⫽⃥\u0002nparsl\u0001𝒜\u0002Ascr\u0001𝒞\u0002Cscr\u0001𝒟\u0002Dscr\u0001𝒢\u0002Gscr\u0001𝒥\u0002Jscr\u0001𝒦\u0002Kscr\u0001𝒩\u0002Nscr\u0001𝒪\u0002Oscr\u0001𝒫\u0002Pscr\u0001𝒬\u0002Qscr\u0001𝒮\u0002Sscr\u0001𝒯\u0002Tscr\u0001𝒰\u0002Uscr\u0001𝒱\u0002Vscr\u0001𝒲\u0002Wscr\u0001𝒳\u0002Xscr\u0001𝒴\u0002Yscr\u0001𝒵\u0002Zscr\u0001𝒶\u0002ascr\u0001𝒷\u0002bscr\u0001𝒸\u0002cscr\u0001𝒹\u0002dscr\u0001𝒻\u0002fscr\u0001𝒽\u0002hscr\u0001𝒾\u0002iscr\u0001𝒿\u0002jscr\u0001𝓀\u0002kscr\u0001𝓁\u0002lscr\u0001𝓂\u0002mscr\u0001𝓃\u0002nscr\u0001𝓅\u0002pscr\u0001𝓆\u0002qscr\u0001𝓇\u0002rscr\u0001𝓈\u0002sscr\u0001𝓉\u0002tscr\u0001𝓊\u0002uscr\u0001𝓋\u0002vscr\u0001𝓌\u0002wscr\u0001𝓍\u0002xscr\u0001𝓎\u0002yscr\u0001𝓏\u0002zscr\u0001𝔄\u0002Afr\u0001𝔅\u0002Bfr\u0001𝔇\u0002Dfr\u0001𝔈\u0002Efr\u0001𝔉\u0002Ffr\u0001𝔊\u0002Gfr\u0001𝔍\u0002Jfr\u0001𝔎\u0002Kfr\u0001𝔏\u0002Lfr\u0001𝔐\u0002Mfr\u0001𝔑\u0002Nfr\u0001𝔒\u0002Ofr\u0001𝔓\u0002Pfr\u0001𝔔\u0002Qfr\u0001𝔖\u0002Sfr\u0001𝔗\u0002Tfr\u0001𝔘\u0002Ufr\u0001𝔙\u0002Vfr\u0001𝔚\u0002Wfr\u0001𝔛\u0002Xfr\u0001𝔜\u0002Yfr\u0001𝔞\u0002afr\u0001𝔟\u0002bfr\u0001𝔠\u0002cfr\u0001𝔡\u0002dfr\u0001𝔢\u0002efr\u0001𝔣\u0002ffr\u0001𝔤\u0002gfr\u0001𝔥\u0002hfr\u0001𝔦\u0002ifr\u0001𝔧\u0002jfr\u0001𝔨\u0002kfr\u0001𝔩\u0002lfr\u0001𝔪\u0002mfr\u0001𝔫\u0002nfr\u0001𝔬\u0002ofr\u0001𝔭\u0002pfr\u0001𝔮\u0002qfr\u0001𝔯\u0002rfr\u0001𝔰\u0002sfr\u0001𝔱\u0002tfr\u0001𝔲\u0002ufr\u0001𝔳\u0002vfr\u0001𝔴\u0002wfr\u0001𝔵\u0002xfr\u0001𝔶\u0002yfr\u0001𝔷\u0002zfr\u0001𝔸\u0002Aopf\u0001𝔹\u0002Bopf\u0001𝔻\u0002Dopf\u0001𝔼\u0002Eopf\u0001𝔽\u0002Fopf\u0001𝔾\u0002Gopf\u0001𝕀\u0002Iopf\u0001𝕁\u0002Jopf\u0001𝕂\u0002Kopf\u0001𝕃\u0002Lopf\u0001𝕄\u0002Mopf\u0001𝕆\u0002Oopf\u0001𝕊\u0002Sopf\u0001𝕋\u0002Topf\u0001𝕌\u0002Uopf\u0001𝕍\u0002Vopf\u0001𝕎\u0002Wopf\u0001𝕏\u0002Xopf\u0001𝕐\u0002Yopf\u0001𝕒\u0002aopf\u0001𝕓\u0002bopf\u0001𝕔\u0002copf\u0001𝕕\u0002dopf\u0001𝕖\u0002eopf\u0001𝕗\u0002fopf\u0001𝕘\u0002gopf\u0001𝕙\u0002hopf\u0001𝕚\u0002iopf\u0001𝕛\u0002jopf\u0001𝕜\u0002kopf\u0001𝕝\u0002lopf\u0001𝕞\u0002mopf\u0001𝕟\u0002nopf\u0001𝕠\u0002oopf\u0001𝕡\u0002popf\u0001𝕢\u0002qopf\u0001𝕣\u0002ropf\u0001𝕤\u0002sopf\u0001𝕥\u0002topf\u0001𝕦\u0002uopf\u0001𝕧\u0002vopf\u0001𝕨\u0002wopf\u0001𝕩\u0002xopf\u0001𝕪\u0002yopf\u0001𝕫\u0002zopf\u0001ﬀ\u0002fflig\u0001ﬁ\u0002filig\u0001ﬂ\u0002fllig\u0001ﬃ\u0002ffilig\u0001ﬄ\u0002ffllig';
// tables:end

interface LinkRules {
	schemaSearch: string;
	hostFuzzyTest: string;
	http: string;
	noHttp: string;
	mailto: string;
	twitter: string;
	linkFuzzy: string;
	emailFuzzy: string;
}

/**
 * The patterns of linkify-it 5 (`lib/re.mjs` and `compile`), as mailparser configures it:
 * the full TLD list and `onion`, fuzzy links, fuzzy IP addresses and fuzzy email addresses,
 * the schemas `http:`, `https:`, `git:`, `//`, `mailto:` and `@` (no `ftp:`).
 */
function linkRules(): LinkRules {
	const zpcc = `${UC_Z}|${UC_P}|${UC_CC}`;
	const zcc = `${UC_Z}|${UC_CC}`;
	const separators = '[><\uff5c]';
	const letter = `(?:(?!${separators}|${zpcc})${UC_ANY})`;
	const ip4 =
		'(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)';
	const auth = `(?:(?:(?!${zcc}|[@/\\[\\]()]).){1,50}@)?`;
	const port = '(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?';
	const terminator = `(?=$|${separators}|${zpcc})(?!-|_|:\\d|\\.-|\\.(?!$|${zpcc}))`;
	const path =
		'(?:[/?#](?:' +
		`(?!${zcc}|${separators}|[()[\\]{}.,"'?!\\-;]).|` +
		`\\[(?:(?!${zcc}|\\]).)*\\]|` +
		`\\((?:(?!${zcc}|[)]).)*\\)|` +
		`\\{(?:(?!${zcc}|[}]).)*\\}|` +
		`\\"(?:(?!${zcc}|["]).)+\\"|` +
		`\\'(?:(?!${zcc}|[']).)+\\'|` +
		`\\'(?=${letter}|[-])|` +
		'\\.{2,}[a-zA-Z0-9%/&]|' +
		`\\.(?!${zcc}|[.]|$)|` +
		'\\-+|' +
		`,(?!${zcc}|$)|` +
		`;(?!${zcc}|$)|` +
		`\\!+(?!${zcc}|[!]|$)|` +
		`\\?(?!${zcc}|[?]|$)` +
		')+|\\/)?';
	const emailName = '[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]{0,63}';
	const xn = 'xn--[a-z0-9\\-]{1,59}';
	const domainRoot = `(?:${xn}|${letter}{1,63})`;
	const domain = `(?:${xn}|(?:${letter})|(?:${letter}(?:-|${letter}){0,61}${letter}))`;
	const host = `(?:(?:(?:(?:${domain})\\.)*${domain}))`;
	const hostFuzzy = `(?:${ip4}|(?:(?:(?:${domain})\\.)+(?:${LINK_TLDS})))`;
	const before = `(^|(?![.:/\\-_@])(?:[$+<=>^\`|\uff5c]|${zpcc}))`;
	return {
		schemaSearch: `(^|(?!_)(?:[><\uff5c]|${zpcc}))(http:|https:|\\/\\/|mailto:|git:|@)`,
		hostFuzzyTest: `localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:${LINK_TLDS})(?:${zpcc}|>|$))`,
		http: `^\\/\\/${auth}${host}${port}${terminator}${path}`,
		noHttp: `^${auth}(?:localhost|(?:(?:${domain})\\.)+${domainRoot})${port}${terminator}${path}`,
		mailto: `^${emailName}@${host}${terminator}`,
		twitter: `^([a-zA-Z0-9_]){1,15}(?!_)(?=$|${zpcc})`,
		linkFuzzy: `${before}((?![$+<=>^\`|\uff5c])${hostFuzzy}${port}${terminator}${path})`,
		emailFuzzy: `(^|${separators}|"|\\(|${zcc})(${emailName}@${hostFuzzy}${terminator})`,
	};
}

interface Link {
	index: number;
	lastIndex: number;
	url: string;
}

/** The longest text line that the link rules read here: a longer line stays in the host. */
const LINK_LINE_LIMIT = 4000;

/**
 * `match` of linkify-it for the text of a mail, after its `pretest`. A link never holds a
 * line break, and the patterns read a line break as the start or the end of the text, so the
 * port reads each line alone: the cost of a pattern is bound by the length of a line.
 */
function linksOf(text: string): Link[] {
	const out: Link[] = [];
	if (!text.includes('@') && !text.includes('.') && !text.includes(':')) {
		if (!found('localhost', 'i', text)) return out;
	}
	const rules = linkRules();
	const lines = text.split('\n');
	let pretest = text.includes('@') || found('localhost|www\\.', 'i', text);
	for (const line of lines) {
		if (pretest) break;
		if (line.length > LINK_LINE_LIMIT) throw inHost('a text line too long for the link rules');
		const schema = line.includes(':') || line.includes('//');
		pretest =
			(schema && found(rules.schemaSearch, 'i', line)) ||
			(line.includes('.') && found(rules.hostFuzzyTest, 'i', line));
	}
	if (!pretest) return out;
	let offset = 0;
	for (const line of lines) {
		const start = offset;
		offset += line.length + 1;
		const hasAt = line.includes('@');
		const hasDot = line.includes('.');
		if (!hasAt && !hasDot && !line.includes(':')) continue;
		if (line.length > LINK_LINE_LIMIT) throw inHost('a text line too long for the link rules');
		const schemed: Link[] = [];
		const emails: Link[] = [];
		const fuzzy: Link[] = [];
		let at = 0;
		while (hasAt || line.includes(':') || line.includes('//')) {
			const m = RegExp.exec(rules.schemaSearch, 'i', line, at);
			if (m === null) break;
			at = m[1];
			const schema = line.slice(m[4], m[5]).toLowerCase();
			const tail = line.slice(at);
			let rule = rules.http;
			if (schema === '//') rule = rules.noHttp;
			if (schema === 'mailto:') rule = rules.mailto;
			if (schema === '@') rule = rules.twitter;
			const hit = RegExp.exec(rule, schema === '@' ? '' : 'i', tail, 0);
			if (hit === null) continue;
			if (schema === '//' && at >= 3 && ':/'.includes(line.charAt(at - 3))) continue;
			const position = start + at;
			if (schema === '@' && position >= 2 && text.charAt(2 * position - 2) === '@') continue;
			const index = m[0] + m[3] - m[2];
			const raw = line.slice(index, at + hit[1]);
			let url = raw;
			if (schema === '@') url = `https://twitter.com/${raw.startsWith('@') ? raw.slice(1) : raw}`;
			if (schema === 'mailto:' && !found('^mailto:', 'i', raw)) url = `mailto:${raw}`;
			schemed.push({ index: start + index, lastIndex: start + at + hit[1], url });
		}
		at = 0;
		while (hasDot) {
			const m = RegExp.exec(rules.linkFuzzy, 'i', line, at);
			if (m === null) break;
			at = m[1];
			const index = m[0] + m[3] - m[2];
			fuzzy.push({
				index: start + index,
				lastIndex: start + at,
				url: `http://${line.slice(index, at)}`,
			});
		}
		at = 0;
		while (hasAt) {
			const m = RegExp.exec(rules.emailFuzzy, 'i', line, at);
			if (m === null) break;
			at = m[1];
			const index = m[0] + m[3] - m[2];
			const raw = line.slice(index, at);
			const url = found('^mailto:', 'i', raw) ? raw : `mailto:${raw}`;
			emails.push({ index: start + index, lastIndex: start + at, url });
		}
		const lists = [schemed, emails, fuzzy];
		const next = [0, 0, 0];
		let last = out.length > 0 ? out[out.length - 1].lastIndex : 0;
		while (true) {
			let best = -1;
			for (let k = 0; k < 3; k++) {
				const candidate = lists[k][next[k]];
				if (candidate === undefined) continue;
				const chosen = best < 0 ? undefined : lists[best][next[best]];
				if (
					chosen === undefined ||
					candidate.index < chosen.index ||
					(candidate.index === chosen.index && candidate.lastIndex > chosen.lastIndex)
				) {
					best = k;
				}
			}
			if (best < 0) break;
			const link = lists[best][next[best]];
			next[best]++;
			if (link.index < last) continue;
			out.push(link);
			last = link.lastIndex;
		}
	}
	return out;
}

/** `he.encode` with named references (`useNamedReferences`), as textToHtml of mailparser calls it. */
function encodeNamed(text: string): string {
	const escaped = text
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('`', '&grave;');
	const unsafe = '[^\\x00\\x0a\\x0d\\x20-\\x7e]';
	if (!found(unsafe, '', escaped)) return escaped;
	if (found('(?:&lt;|&gt;)\\u20d2|=\\u20e5', '', escaped)) {
		throw inHost('text with a character reference of two characters');
	}
	const out: string[] = [];
	let at = 0;
	while (at < escaped.length) {
		const m = RegExp.exec(unsafe, '', escaped, at);
		if (m === null) break;
		const index = m[0];
		out.push(escaped.slice(at, index));
		let size = 2;
		let hit =
			index + 1 < escaped.length
				? HE_NAMES.indexOf(`\x01${escaped.slice(index, index + 2)}\x02`)
				: -1;
		if (hit < 0) {
			size = 1;
			hit = HE_NAMES.indexOf(`\x01${escaped.charAt(index)}\x02`);
		}
		if (hit >= 0) {
			const from = hit + size + 2;
			const to = HE_NAMES.indexOf('\x01', from);
			out.push(`&${HE_NAMES.slice(from, to < 0 ? HE_NAMES.length : to)};`);
			at = index + size;
			continue;
		}
		let code = escaped.charCodeAt(index);
		const low = index + 1 < escaped.length ? escaped.charCodeAt(index + 1) : 0;
		at = index + 1;
		if (code >= 0xd800 && code <= 0xdbff && low >= 0xdc00 && low <= 0xdfff) {
			code = (code - 0xd800) * 0x400 + low - 0xdc00 + 0x10000;
			at = index + 2;
		} else if (code >= 0x80 && code <= 0x9f && ![0x81, 0x8d, 0x8f, 0x90, 0x9d].includes(code)) {
			out.push(escaped.charAt(index));
			continue;
		}
		out.push(`&#x${code.toString(16).toUpperCase()};`);
	}
	out.push(escaped.slice(at));
	return out.join('');
}

/** textToHtml of mailparser: links by linkify-it, entities by `he`, paragraphs and line breaks. */
function textToHtml(text: string): string {
	if (text.includes('\r') || text.includes('\x00')) {
		throw inHost('text with a carriage return alone, for the HTML form');
	}
	const parts: string[] = [];
	let last = 0;
	for (const link of linksOf(text)) {
		if (last < link.index) parts.push(encodeNamed(text.slice(last, link.index)));
		const shown = encodeNamed(text.slice(link.index, link.lastIndex));
		parts.push(`<a href="${link.url.replaceAll('"', '&quot;')}">${shown}</a>`);
		last = link.lastIndex;
	}
	parts.push(encodeNamed(text.slice(last)));
	const lines = parts.join('').trim().split('\n');
	for (let k = 0; k < lines.length; k++) {
		let line = lines[k];
		while (line.endsWith(' ') || line.endsWith('\t')) line = line.slice(0, -1);
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
