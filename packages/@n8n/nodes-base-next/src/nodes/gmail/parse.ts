/**
 * Parses a raw RFC 822 message into the fields that `parseRawEmail` in nodes-base
 * Gmail/GenericFunctions.ts gets from mailparser. mailparser needs Node streams and `Buffer`,
 * which the sandbox does not have, so this port uses web APIs only. It follows mailparser 3.9,
 * libmime 5.3, mailsplit 5.4 and the addressparser of nodemailer 8.
 */
import { utf8 } from './mime';

const UTF8 = new TextDecoder();

const latin1Of = (bytes: Uint8Array) =>
	Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

const bytesOfLatin1 = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);

/**
 * Base64 or base64url as Node's `Buffer.from(text, 'base64')` reads it: other characters drop
 * out and the first `=` ends the data.
 */
function bytesOfBase64(text: string): Uint8Array {
	const [clean] = text
		.replace(/-/g, '+')
		.replace(/_/g, '/')
		.replace(/[^A-Za-z0-9+/=]/g, '')
		.split('=');
	const whole = clean.slice(0, clean.length - (clean.length % 4 === 1 ? 1 : 0));
	return bytesOfLatin1(atob(whole.padEnd(Math.ceil(whole.length / 4) * 4, '=')));
}

const charsetKey = (charset: string) => charset.toLowerCase().replace(/[^a-z0-9]/g, '');

const UTF8_CHARSETS = ['', 'ascii', 'usascii', 'utf8', '7bit'];

/** Text in `charset`. An unknown charset reads as UTF-8, as iconv-lite falls back. */
function decodeCharset(bytes: Uint8Array, charset: string | undefined): string {
	const name = (charset ?? '').trim();
	if (UTF8_CHARSETS.includes(charsetKey(name))) return UTF8.decode(bytes);
	try {
		return new TextDecoder(name).decode(bytes);
	} catch {
		return UTF8.decode(bytes);
	}
}

const joined = (chunks: readonly Uint8Array[]) => {
	const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
	chunks.reduce((offset, chunk) => {
		bytes.set(chunk, offset);
		return offset + chunk.length;
	}, 0);
	return bytes;
};

/** `=XX` escapes to bytes. Other characters keep their low byte, as libqp writes them. */
const bytesOfEscapes = (text: string) =>
	Uint8Array.from(
		text
			.split(/(=[\da-fA-F]{2})/)
			.flatMap((piece, index) =>
				index % 2 === 1
					? [parseInt(piece.slice(1), 16)]
					: piece.split('').map((char) => char.charCodeAt(0) & 0xff),
			),
	);

const bytesOfQuotedPrintable = (text: string) =>
	bytesOfEscapes(text.replace(/[\t ]+$/gm, '').replace(/=(?:\r?\n|$)/g, ''));

// libmime decodeWord
function decodeWord(charset: string, encoding: string, text: string): string {
	const name = charset.split('*')[0];
	if (encoding.toUpperCase() === 'Q') {
		const spaced = text.replace(/=\s+([0-9a-fA-F])/g, '=$1').replace(/[_\s]/g, ' ');
		return decodeCharset(bytesOfEscapes(latin1Of(utf8(spaced))), name);
	}
	if (encoding.toUpperCase() === 'B') {
		const chunks = text
			.split('=')
			.filter((chunk) => chunk !== '')
			.map(bytesOfBase64);
		return decodeCharset(joined(chunks), name);
	}
	return text;
}

const JOIN = '\uE000';

const joinWords = (encoding: 'B' | 'Q') =>
	new RegExp(
		`(=\\?([^?]+)\\?[${encoding}${encoding.toLowerCase()}]\\?[^?]*\\?=)\\s*(?==\\?([^?]+)\\?[${encoding}${encoding.toLowerCase()}]\\?[^?]*\\?=)`,
		'g',
	);

/** RFC 2047 encoded words. Adjacent words of one charset join first, so a split character stays whole. */
function decodeWords(text: string): string {
	const join = (match: string, left: string, leftCharset: string, rightCharset: string) =>
		charsetKey(leftCharset) === charsetKey(rightCharset) ? `${left}${JOIN}` : match;
	return text
		.replace(joinWords('B'), join)
		.replace(joinWords('Q'), join)
		.replace(new RegExp(`(\\?=)?${JOIN}(=\\?([^?]+)\\?[QqBb]\\?)?`, 'g'), '')
		.replace(/(=\?[^?]+\?[QqBb]\?[^?]*\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]*\?=)/g, '$1')
		.replace(
			/=\?([\w_\-*]+)\?([QqBb])\?([^?]*)\?=/g,
			(_match, charset: string, encoding: string, word: string) =>
				decodeWord(charset, encoding, word),
		);
}

/** One header field as mailsplit keeps it: the lowercase name and the raw line with its folding. */
interface HeaderLine {
	readonly key: string;
	readonly line: string;
}

function headerLinesOf(head: string): HeaderLine[] {
	const lines = head
		.replace(/[\r\n]+$/, '')
		.split(/\r?\n/)
		.reduce<string[]>(
			(fields, line, index) =>
				index > 0 && (line.startsWith(' ') || line.startsWith('\t'))
					? [...fields.slice(0, -1), `${fields[fields.length - 1]}\r\n${line}`]
					: [...fields, line],
			[],
		);
	// An mbox "From " line is not a header.
	const fields = lines[0] !== undefined && /^From /i.test(lines[0]) ? lines.slice(1) : lines;
	return fields.map((line) => ({
		key: line
			.substring(0, Math.max(line.indexOf(':'), 0))
			.toLowerCase()
			.trim(),
		line,
	}));
}

/** The value of a header line, unfolded and trimmed. */
const valueOf = (line: string) =>
	/^\s*([^:]+):(.*)$/.exec(line.replace(/(?:\r?\n|\r)[ \t]*/g, ' ').trim())?.[2]?.trim() ?? '';

const firstValue = (lines: readonly HeaderLine[], key: string) => {
	const header = lines.find((line) => line.key === key);
	return header ? valueOf(header.line) : '';
};

interface HeaderValue {
	readonly value: string;
	readonly params: Readonly<Record<string, string>>;
}

/** `text/plain; charset="utf-8"`, with RFC 2231 continuations. Mirrors libmime `parseHeaderValue`. */
function parseHeaderValue(text: string): HeaderValue {
	const state: {
		key?: string;
		value: string;
		stage: 'key' | 'value';
		quote: boolean;
		escaped: boolean;
	} = { value: '', stage: 'value', quote: false, escaped: false };
	const params: Record<string, string> = {};
	const head = { value: '' };
	const close = () => {
		if (state.key === undefined) head.value = state.value.trim();
		else params[state.key] = state.value.trim();
	};
	for (const char of text) {
		if (state.stage === 'key') {
			if (char === '=') {
				state.key = state.value.trim().toLowerCase();
				state.stage = 'value';
				state.value = '';
			} else {
				state.value += char;
			}
			continue;
		}
		if (state.escaped) {
			state.value += char;
		} else if (char === '\\') {
			state.escaped = true;
			continue;
		} else if (state.quote && char === '"') {
			state.quote = false;
		} else if (!state.quote && char === '"') {
			state.quote = true;
		} else if (!state.quote && char === ';') {
			close();
			state.stage = 'key';
			state.value = '';
		} else {
			state.value += char;
		}
		state.escaped = false;
	}
	if (state.stage === 'value') close();
	else if (state.value.trim()) params[state.value.trim().toLowerCase()] = '';
	return { value: head.value, params: continued(params) };
}

/** Joins `name*0*=utf-8''a%20`, `name*1*=b` into `name`. */
function continued(params: Readonly<Record<string, string>>): Record<string, string> {
	interface Continuation {
		readonly charset?: string;
		readonly values: ReadonlyArray<{ readonly nr: number; readonly value: string }>;
	}
	const parts = Object.entries(params).reduce((found, [key, value]) => {
		const match = /\*((\d+)\*?)?$/.exec(key);
		if (!match) return found;
		const name = key.substring(0, match.index).toLowerCase();
		const nr = Number(match[2]) || 0;
		const entry = found.get(name) ?? { values: [] };
		const charset = nr === 0 && match[0].endsWith('*') ? /^([^']*)'[^']*'(.*)$/.exec(value) : null;
		return new Map(found).set(name, {
			charset: charset ? charset[1] || 'utf-8' : entry.charset,
			values: [...entry.values, { nr, value: charset ? charset[2] : value }],
		});
	}, new Map<string, Continuation>());
	const joinedValue = ({ charset, values }: Continuation) => {
		const value = [...values]
			.sort((a, b) => a.nr - b.nr)
			.map((entry) => entry.value)
			.join('');
		if (!charset) return decodeWords(value);
		const escaped = value
			.replace(/[=?_\s]/g, (char) =>
				char === ' ' ? '_' : `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
			)
			.replace(/%/g, '=');
		return decodeWords(`=?${charset}?Q?${escaped}?=`);
	};
	return {
		...Object.fromEntries(
			Object.entries(params).filter(([key]) => !/\*((\d+)\*?)?$/.test(key) && !parts.has(key)),
		),
		...Object.fromEntries([...parts].map(([name, entry]) => [name, joinedValue(entry)])),
	};
}

// nodemailer addressparser

interface Token {
	readonly type: 'operator' | 'text';
	value: string;
	noBreak?: boolean;
}

const OPERATORS: Readonly<Record<string, string>> = {
	'"': '"',
	'(': ')',
	'<': '>',
	',': '',
	':': ';',
	';': '',
};

function tokensOf(text: string): Token[] {
	const list: Token[] = [];
	const state: { expecting: string; escaped: boolean; node?: Token } = {
		expecting: '',
		escaped: false,
	};
	text.split('').forEach((char, index, chars) => {
		const next = chars[index + 1] ?? '';
		if (!state.escaped) {
			if (char === state.expecting) {
				list.push({
					type: 'operator',
					value: char,
					...(next && ![' ', '\t', '\r', '\n', ',', ';'].includes(next) ? { noBreak: true } : {}),
				});
				state.node = undefined;
				state.expecting = '';
				return;
			}
			if (!state.expecting && char in OPERATORS) {
				list.push({ type: 'operator', value: char });
				state.node = undefined;
				state.expecting = OPERATORS[char];
				return;
			}
			if (['"', "'"].includes(state.expecting) && char === '\\') {
				state.escaped = true;
				return;
			}
		}
		const node = state.node ?? { type: 'text', value: '' };
		if (!state.node) list.push(node);
		state.node = node;
		const kept = char === '\n' ? ' ' : char;
		if (kept.charCodeAt(0) >= 0x21 || kept === ' ' || kept === '\t') node.value += kept;
		state.escaped = false;
	});
	return list
		.map((token) => ({ ...token, value: token.value.trim() }))
		.filter((token) => token.value !== '');
}

/** One parsed address. A group has `group` and no `address`. */
interface Address {
	readonly address?: string;
	readonly name: string;
	readonly group?: Address[];
}

type Field = 'address' | 'comment' | 'group' | 'text';

const FIELD_OF: Readonly<Record<string, Field>> = { '<': 'address', '(': 'comment', ':': 'group' };

/** The last index whose text matches, skipping quoted text. */
const lastUnquoted = (
	texts: readonly string[],
	quoted: readonly boolean[],
	test: (text: string) => boolean,
) => texts.reduce((found, text, index) => (!quoted[index] && test(text) ? index : found), -1);

function addressOf(tokens: readonly Token[], depth: number): Address[] {
	const data: Record<Field, string[]> = { address: [], comment: [], group: [], text: [] };
	const quoted: boolean[] = [];
	const state: { field: Field; isGroup: boolean; insideQuotes: boolean } = {
		field: 'text',
		isGroup: false,
		insideQuotes: false,
	};
	tokens.forEach((token, index) => {
		if (token.type === 'operator') {
			state.field = FIELD_OF[token.value] ?? 'text';
			state.isGroup ||= token.value === ':';
			state.insideQuotes = token.value === '"' ? !state.insideQuotes : false;
			return;
		}
		// Apple Mail drops the text between an unexpected "<" and the address.
		const value = state.field === 'address' ? token.value.replace(/^[^<]*<\s*/, '') : token.value;
		const target = data[state.field];
		if (index > 0 && tokens[index - 1].noBreak && target.length) {
			target[target.length - 1] += value;
			if (state.field === 'text' && state.insideQuotes) quoted[quoted.length - 1] = true;
		} else {
			target.push(value);
			if (state.field === 'text') quoted.push(state.insideQuotes);
		}
	});
	if (!data.text.length && data.comment.length) {
		data.text = data.comment;
		data.comment = [];
	}
	if (state.isGroup) {
		const members = data.group.length
			? addressparser(data.group.join(','), depth + 1).flatMap((member) => member.group ?? [member])
			: [];
		return [{ name: data.text.join(' ') || '', group: members }];
	}
	if (!data.address.length && data.text.length) {
		// An address in quoted text is not taken: `"a@b"@c` is one local part.
		const strict = lastUnquoted(data.text, quoted, (text) => /^[^@\s]+@[^@\s]+$/.test(text));
		const loose = lastUnquoted(data.text, quoted, (text) => /\s*\b[^@\s]+@[^\s]+\b\s*/.test(text));
		if (strict >= 0) {
			data.address = data.text.splice(strict, 1);
			quoted.splice(strict, 1);
		} else if (loose >= 0) {
			data.text[loose] = data.text[loose]
				.replace(/\s*\b[^@\s]+@[^\s]+\b\s*/, (match) => {
					data.address = [match.trim()];
					return ' ';
				})
				.trim();
		}
	}
	if (!data.text.length && data.comment.length) {
		data.text = data.comment;
		data.comment = [];
	}
	if (data.address.length > 1) data.text = [...data.text, ...data.address.splice(1)];
	const text = data.text.join(' ');
	const address = data.address.join(' ');
	const entry = { address: address || text || '', name: text || address || '' };
	if (entry.address !== entry.name) return [entry];
	return [/@/.test(entry.address) ? { ...entry, name: '' } : { ...entry, address: '' }];
}

/** Parses an address field such as `Ada <ada@example.com>, "Doe, J" <j@example.com>`. */
function addressparser(text: string, depth = 0): Address[] {
	if (depth > 50) return [];
	const groups = tokensOf(text).reduce<Token[][]>(
		(all, token) =>
			token.type === 'operator' && (token.value === ',' || token.value === ';')
				? [...all, []]
				: [...all.slice(0, -1), [...all[all.length - 1], token]],
		[[]],
	);
	// "Joe Foo, PhD <joe@example.com>" splits at the comma; join the name back.
	return groups
		.filter((tokens) => tokens.length)
		.flatMap((tokens) => addressOf(tokens, depth))
		.reduceRight<Address[]>((after, current) => {
			const [next, ...rest] = after;
			return next &&
				current.address === '' &&
				current.name &&
				!current.group &&
				next.address &&
				next.name
				? [{ ...next, name: `${current.name}, ${next.name}` }, ...rest]
				: [current, ...after];
		}, []);
}

const B_WORDS = /^(=\?([^?]+)\?[Bb]\?[^?]*\?=)(\s*=\?([^?]+)\?[Bb]\?[^?]*\?=)*$/;

// mailparser decodeAddresses: an encoded name without an address can hold whole addresses.
function decodeAddresses(addresses: readonly Address[]): Address[] {
	const decoded = (entry: Address): Address => {
		const name = entry.name.trim();
		return {
			...entry,
			name: name ? decodeWords(name) : name,
			...(entry.group ? { group: decodeAddresses(entry.group) } : {}),
		};
	};
	const expands = (entry: Address) => !entry.address && B_WORDS.test(entry.name.trim());
	return [
		...addresses.filter((entry) => !expands(entry)).map(decoded),
		...addresses
			.filter(expands)
			.flatMap((entry) => addressparser(decodeWords(entry.name.trim())))
			.map(decoded),
	];
}

const HTML_NAMES: Readonly<Record<string, string>> = {
	'"': 'quot',
	'&': 'amp',
	"'": 'apos',
	'<': 'lt',
	'>': 'gt',
	'`': 'grave',
};

/** The names `he` uses for U+00A0 to U+00FF. */
const LATIN1_NAMES =
	'nbsp iexcl cent pound curren yen brvbar sect die copy ordf laquo not shy reg macr deg pm sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 half frac34 iquest Agrave Aacute Acirc Atilde Auml angst AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml div oslash ugrave uacute ucirc uuml yacute thorn yuml'.split(
		' ',
	);

const PUNCTUATION_NAMES: Readonly<Record<number, string>> = {
	0x2013: 'ndash',
	0x2014: 'mdash',
	0x2018: 'lsquo',
	0x2019: 'rsquo',
	0x201a: 'sbquo',
	0x201c: 'ldquo',
	0x201d: 'rdquo',
	0x201e: 'bdquo',
	0x2020: 'dagger',
	0x2021: 'Dagger',
	0x2022: 'bull',
	0x2026: 'mldr',
	0x2030: 'permil',
	0x2039: 'lsaquo',
	0x203a: 'rsaquo',
	0x20ac: 'euro',
	0x2122: 'trade',
};

const nameOf = (code: number) =>
	code >= 0xa0 && code <= 0xff ? LATIN1_NAMES[code - 0xa0] : PUNCTUATION_NAMES[code];

/**
 * HTML escapes as `he.encode` writes them: the special ASCII characters, control characters and
 * all non-ASCII characters. `named` uses the common entity names; other characters get `&#x…;`.
 */
function encodeHtml(text: string, named: boolean): string {
	return text.replace(/["&'<>`]|[^\0\n\r\x20-\x7e]/gu, (char) => {
		const code = char.codePointAt(0) ?? 0;
		const name = named ? (HTML_NAMES[char] ?? nameOf(code)) : undefined;
		return name ? `&${name};` : `&#x${code.toString(16).toUpperCase()};`;
	});
}

function addressesText(addresses: readonly Address[]): string {
	return addresses
		.map((entry) => {
			const name = entry.name ? `"${entry.name}"${entry.group ? ': ' : ''}` : '';
			const address = entry.address ? (entry.name ? ` <${entry.address}>` : entry.address) : '';
			return `${name}${address}${entry.group ? `${addressesText(entry.group)};` : ''}`;
		})
		.join(', ');
}

function addressesHtml(addresses: readonly Address[]): string {
	return addresses
		.map((entry) => {
			const name = entry.name
				? `<span class="mp_address_name">${encodeHtml(entry.name, false)}${entry.group ? ': ' : ''}</span>`
				: '';
			const link = entry.address
				? `<a href="mailto:${encodeHtml(entry.address, false)}" class="mp_address_email">${encodeHtml(entry.address, false)}</a>`
				: '';
			const address = link && entry.name ? ` &lt;${link}&gt;` : link;
			const group = entry.group ? `${addressesHtml(entry.group)};` : '';
			return `<span class="mp_address_group">${name}${address}${group}</span>`;
		})
		.join(', ');
}

/** An address header as mailparser gives it. */
interface AddressObject {
	readonly value: Address[];
	readonly html: string;
	readonly text: string;
}

const addressObjectOf = (value: string): AddressObject => {
	const addresses = decodeAddresses(addressparser(value));
	return { value: addresses, html: addressesHtml(addresses), text: addressesText(addresses) };
};

const messageIdOf = (value: string) =>
	value.length
		? `${value.startsWith('<') ? '' : '<'}${value}${value.endsWith('>') ? '' : '>'}`
		: false;

const ADDRESS_KEYS = ['from', 'to', 'cc', 'bcc', 'reply-to'];

/** The value of each field that the parsed mail exposes, by header key. */
function fieldValue(key: string, value: string): unknown {
	if (ADDRESS_KEYS.includes(key)) return addressObjectOf(value);
	if (key === 'subject') return decodeWords(value) || undefined;
	if (key === 'date') {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? new Date() : date;
	}
	if (key === 'references') return decodeWords(value).split(/\s+/).map(messageIdOf);
	if (key === 'message-id' || key === 'in-reply-to') return messageIdOf(decodeWords(value));
	return undefined;
}

/** These keep the last value; the others become a list when the message repeats them. */
const SINGLE_KEYS = ['message-id', 'from', 'in-reply-to', 'reply-to', 'subject', 'date'];

const FIELD_NAMES: Readonly<Record<string, string>> = {
	subject: 'subject',
	references: 'references',
	date: 'date',
	to: 'to',
	from: 'from',
	cc: 'cc',
	bcc: 'bcc',
	'message-id': 'messageId',
	'in-reply-to': 'inReplyTo',
	'reply-to': 'replyTo',
};

function fieldsOf(lines: readonly HeaderLine[]): Record<string, unknown> {
	const values = new Map<string, unknown[]>();
	for (const { key, line } of lines) {
		if (!(key in FIELD_NAMES)) continue;
		const value = fieldValue(key, valueOf(line));
		if (!value) continue;
		values.set(key, [...(values.get(key) ?? []), ...(Array.isArray(value) ? value : [value])]);
	}
	return Object.fromEntries(
		Object.keys(FIELD_NAMES).flatMap((key) => {
			const list = values.get(key);
			if (!list?.length) return [];
			const value = SINGLE_KEYS.includes(key) || list.length === 1 ? list[list.length - 1] : list;
			return [[FIELD_NAMES[key], value instanceof Date ? value.toISOString() : value]];
		}),
	);
}

// MIME tree

const TEXT_TYPES = ['text/plain', 'text/html', 'message/delivery-status'];

interface Part {
	readonly root: boolean;
	readonly lines: readonly HeaderLine[];
	readonly contentType: string;
	readonly charset?: string;
	readonly encoding: string;
	readonly disposition: 'inline' | 'attachment';
	readonly filename?: string;
	readonly flowed: boolean;
	readonly delSp: boolean;
	readonly body: string;
	readonly children: readonly Part[];
}

/** The head ends at the first empty line; the line break before it belongs to the head. */
function splitHead(source: string): { head: string; body: string } {
	const empty = /^\r?\n/.exec(source);
	if (empty) return { head: '', body: source.substring(empty[0].length) };
	const end = /\n(\r?\n)/.exec(source);
	return end
		? {
				head: source.substring(0, end.index + 1),
				body: source.substring(end.index + end[0].length),
			}
		: { head: source, body: '' };
}

/** `1` for `--boundary`, `2` for `--boundary--`, as mailsplit `compareBoundary` checks a line. */
function delimiterOf(line: string, boundary: string): 1 | 2 | undefined {
	if (line.length < boundary.length + 3 || line.length > boundary.length + 6) return undefined;
	if (!line.startsWith(`--${boundary}`)) return undefined;
	const rest = line.substring(boundary.length + 2);
	if (rest[0] === '\r' || rest[0] === '\n') return 1;
	const valid = [...rest].every(
		(char, pos) =>
			(pos < 2 && char === '-') ||
			(pos === 2 && (char === '\r' || char === '\n')) ||
			(pos === 3 && char === '\n'),
	);
	return valid ? 2 : undefined;
}

/** The parts between the delimiter lines. The line break before a delimiter belongs to it. */
function bodiesOf(body: string, boundary: string): string[] {
	const parts: string[][] = [];
	const state = { inPart: false, done: false };
	for (const line of body.split(/(?<=\n)/)) {
		if (state.done) break;
		const delimiter = delimiterOf(line, boundary);
		if (delimiter) {
			if (delimiter === 2) state.done = true;
			else parts.push([]);
			state.inPart = delimiter === 1;
			continue;
		}
		if (state.inPart) parts[parts.length - 1].push(line);
	}
	return parts.map((lines, index) => {
		const text = lines.join('');
		const closed = index < parts.length - 1 || state.done;
		return closed ? text.replace(/\r?\n$/, '') : text;
	});
}

function partOf(source: string, root: boolean): Part {
	const { head, body } = splitHead(source);
	const lines = headerLinesOf(head);
	const disposition = parseHeaderValue(firstValue(lines, 'content-disposition'));
	const hasType = lines.some((line) => line.key === 'content-type');
	const type = parseHeaderValue(
		hasType
			? firstValue(lines, 'content-type')
			: /^attachment$/i.test(disposition.value)
				? 'application/octet-stream'
				: 'text/plain',
	);
	const contentType = type.value.toLowerCase().trim() || (root ? 'text/plain' : '');
	const dispositionValue = decodeWords(disposition.value.toLowerCase().trim());
	const multipart = contentType.startsWith('multipart/');
	const flowed = type.params.format?.toLowerCase().trim() === 'flowed';
	const boundary = type.params.boundary;
	const given =
		dispositionValue && !['attachment', 'inline'].includes(dispositionValue)
			? 'attachment'
			: dispositionValue;
	return {
		root,
		lines,
		contentType,
		charset: type.params.charset || undefined,
		encoding: firstValue(lines, 'content-transfer-encoding')
			.replace(/\(.*\)/g, '')
			.toLowerCase()
			.trim(),
		disposition:
			!given && !TEXT_TYPES.includes(contentType)
				? 'attachment'
				: given === 'attachment'
					? 'attachment'
					: 'inline',
		// mailsplit: the disposition filename, else the type name, with encoded words decoded.
		filename: decodeWords(disposition.params.filename || type.params.name || '') || undefined,
		flowed,
		delSp: flowed && type.params.delsp?.toLowerCase().trim() === 'yes',
		body,
		children:
			multipart && boundary ? bodiesOf(body, boundary).map((part) => partOf(part, false)) : [],
	};
}

const isMultipart = (part: Part) => part.contentType.startsWith('multipart/');

const isInlineText = (part: Part) =>
	!isMultipart(part) && TEXT_TYPES.includes(part.contentType) && part.disposition === 'inline';

const partsOf = (part: Part): Part[] => [part, ...part.children.flatMap(partsOf)];

function bytesOf(part: Part): Uint8Array {
	if (part.encoding === 'base64') return bytesOfBase64(part.body);
	if (part.encoding === 'quoted-printable') return bytesOfQuotedPrintable(part.body);
	return utf8(part.body);
}

// libmime decodeFlowed
function decodeFlowed(text: string, delSp: boolean): string {
	// One array that grows, so a long body stays linear.
	const lines: string[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		const last = lines[lines.length - 1];
		const soft = index > 0 && / $/.test(last) && !/(^|\n)-- $/.test(last);
		if (soft) lines[lines.length - 1] = `${delSp ? last.slice(0, -1) : last}${line}`;
		else lines.push(line);
	});
	const kept = lines[lines.length - 1] ? lines : lines.slice(0, -1);
	return kept.join('\n').replace(/^ /gm, '');
}

function textOf(part: Part): string {
	const text = decodeCharset(bytesOf(part), part.charset);
	return (part.flowed ? decodeFlowed(text, part.delSp) : text).replace(/\r?\n/g, '\n');
}

// linkify-it as mailparser configures it, for the common links: URLs with a scheme, `www.`
// hosts, e-mail addresses and Twitter names. A host without `www.` needs the TLD list, so it
// stays text.
const LINK =
	/\b(?:https?|git):\/\/[^\s<>"]+|\bmailto:[^\s<>"@]+@[^\s<>"]+|\bwww\.[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-zA-Z]{2,}|(?<=^|[^\w.:/@-])@\w{1,15}(?![\w])/g;

const BRACKETS: ReadonlyArray<readonly [string, string]> = [
	['(', ')'],
	['[', ']'],
	['{', '}'],
];

const count = (text: string, char: string) => text.split(char).length - 1;

/** A link ends before trailing punctuation and an unmatched closing bracket. */
function linkEnd(text: string): string {
	const trimmed = text.replace(/[.,;:!?'"]+$/, '');
	const unmatched = BRACKETS.some(
		([open, close]) => trimmed.endsWith(close) && count(trimmed, close) > count(trimmed, open),
	);
	return unmatched ? linkEnd(trimmed.slice(0, -1)) : trimmed;
}

function linkified(text: string): string {
	const links = [...text.matchAll(LINK)].map((match) => {
		const [found] = match;
		const { index } = match;
		if (found.startsWith('@')) {
			return { index, text: found, url: `https://twitter.com/${found.slice(1)}` };
		}
		if (/^(?:https?|git):\/\/|^mailto:/i.test(found)) {
			const linkText = linkEnd(found);
			return { index, text: linkText, url: linkText };
		}
		if (/^www\./i.test(found)) {
			const linkText = linkEnd(found);
			return { index, text: linkText, url: `http://${linkText}` };
		}
		return { index, text: found, url: `mailto:${found}` };
	});
	const parts = links.reduce<{ html: string; last: number }>(
		(state, link) => ({
			html: `${state.html}${encodeHtml(text.slice(state.last, link.index), true)}<a href="${link.url.replace(/"/g, '&quot;')}">${encodeHtml(link.text, true)}</a>`,
			last: link.index + link.text.length,
		}),
		{ html: '', last: 0 },
	);
	return `${parts.html}${encodeHtml(text.slice(parts.last), true)}`;
}

// mailparser textToHtml
function textToHtml(text: string): string {
	const html = linkified(text)
		.replace(/\r?\n/g, '\n')
		.trim()
		.replace(/[ \t]+$/gm, '')
		.trim()
		.replace(/\n\n+/g, '</p><p>')
		.trim()
		.replace(/\n/g, '<br/>');
	return `<p>${html}</p>`;
}

const ENTITIES: ReadonlyMap<string, string> = new Map([
	['amp', '&'],
	['lt', '<'],
	['gt', '>'],
	['quot', '"'],
	['apos', "'"],
	...LATIN1_NAMES.map((name, index) => [name, String.fromCharCode(0xa0 + index)] as const),
	...Object.entries(PUNCTUATION_NAMES).map(
		([code, name]) => [name, String.fromCharCode(Number(code))] as const,
	),
	['uml', '\u00a8'],
	['plusmn', '\u00b1'],
	['frac12', '\u00bd'],
	['aring', '\u00e5'],
	['Aring', '\u00c5'],
	['hellip', '\u2026'],
]);

const decodeEntities = (html: string) =>
	html.replace(/&(#x[\da-f]+|#\d+|[a-z\d]+);/gi, (match, entity: string) => {
		if (!entity.startsWith('#'))
			return ENTITIES.get(entity) ?? ENTITIES.get(entity.toLowerCase()) ?? match;
		const code = /^#x/i.test(entity) ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
		return code <= 0x10ffff ? String.fromCodePoint(code) : match;
	});

/** Greedy wrap at 80 characters, as html-to-text does by default. */
function wrapped(line: string): string {
	const lines: string[] = [];
	line.split(' ').forEach((word, index) => {
		const last = lines[lines.length - 1];
		if (index === 0 || (last && `${last} ${word}`.length > 80)) lines.push(word);
		else lines[lines.length - 1] = last ? `${last} ${word}` : word;
	});
	return lines.join('\n');
}

// Markers for line breaks while tags go: a block that needs an empty line around it, a block
// on its own line, a <br>, and a list item prefix.
const [WIDE, BLOCK, BREAK, ITEM] = ['\uE001', '\uE002', '\uE003', '\uE004'];

const upperText = (html: string) =>
	html
		.replace(/<[^>]*>/g, '')
		.replace(/&[^;\s]+;|[^&]+/g, (part) => (part.startsWith('&') ? part : part.toUpperCase()));

/**
 * The text of an HTML part, close to html-to-text: blocks on own lines, headings in capitals,
 * links as `text [url]`, lines wrapped at 80 characters. html-to-text handles much more markup.
 */
function htmlToText(html: string): string {
	const marked = html
		.replace(/<(head|style|script|title)\b[\s\S]*?<\/\1\s*>/gi, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(
			/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,
			(_m, _level, inner: string) => `${WIDE}${upperText(inner)}${WIDE}`,
		)
		.replace(
			/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi,
			(_m, _q, href: string, inner: string) => {
				const label = inner.replace(/<[^>]*>/g, '').trim();
				const url = decodeEntities(href).replace(/^mailto:/i, '');
				return label ? `${label} [${url}]` : url;
			},
		)
		.replace(/<img\b[^>]*>/gi, (tag) => {
			const attribute = (name: string) =>
				new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag)?.[2] ?? '';
			const [alt, src] = [attribute('alt'), attribute('src')];
			return [alt, src && `[${src}]`].filter(Boolean).join(' ');
		})
		.replace(/<br\s*\/?>/gi, BREAK)
		.replace(/<li\b[^>]*>/gi, `${BLOCK}${ITEM}`)
		.replace(/<\/?(p|table|blockquote|pre|ul|ol)\b[^>]*>/gi, WIDE)
		.replace(/<\/?(div|tr|li|section|article|header|footer)\b[^>]*>/gi, BLOCK)
		.replace(/<[^>]*>/g, '');
	return (
		decodeEntities(marked.replace(/[ \t\r\n\f]+/g, ' '))
			.replace(new RegExp(` ?([${WIDE}${BLOCK}${BREAK}${ITEM}]) ?`, 'g'), '$1')
			// Blocks next to each other share their line breaks; each <br> adds one.
			.replace(new RegExp(`[${WIDE}${BLOCK}]+`, 'g'), (run) => (run.includes(WIDE) ? '\n\n' : '\n'))
			.replace(new RegExp(BREAK, 'g'), '\n')
			.trim()
			.split('\n')
			.map((line) => wrapped(line.trim()).replace(new RegExp(ITEM, 'g'), ' * '))
			.join('\n')
	);
}

interface TextContent {
	readonly text?: string;
	readonly html?: string;
	readonly textAsHtml?: string;
}

// mailparser getTextContent
function textContentOf(root: Part): TextContent {
	const inline = partsOf(root).filter(isInlineText);
	const hasHtml = inline.some((part) => part.contentType === 'text/html');
	const hasText = inline.some((part) => part.contentType !== 'text/html');
	const visit = (part: Part, alternative: boolean): Array<{ text?: string; html?: string }> => {
		const content = isInlineText(part) ? textOf(part) : '';
		const own: Array<{ text?: string; html?: string }> = !content
			? []
			: part.contentType === 'text/html'
				? [
						{
							...((!alternative && hasText) || (part.root && !hasText)
								? { text: htmlToText(content) }
								: {}),
							html: content,
						},
					]
				: [{ text: content, ...(!alternative && hasHtml ? { html: textToHtml(content) } : {}) }];
		const nested = alternative || part.contentType === 'multipart/alternative';
		return [...own, ...part.children.flatMap((child) => visit(child, nested))];
	};
	const entries = visit(root, false);
	const texts = entries.flatMap(({ text }) => (text === undefined ? [] : [text]));
	const htmls = entries.flatMap(({ html }) => (html === undefined ? [] : [html]));
	return {
		...(htmls.length ? { html: htmls.join('<br/>\n') } : {}),
		...(texts.length
			? { text: texts.join('\n'), textAsHtml: texts.map(textToHtml).join('<br/>\n') }
			: {}),
	};
}

/** Inline images that the HTML names by `cid:` become data URLs, as mailparser does. */
function withImages(html: string, root: Part): string {
	// The first attachment with a content ID wins.
	const images = new Map(
		partsOf(root)
			.filter((part) => !isMultipart(part) && !isInlineText(part))
			.reverse()
			.flatMap((part) => {
				const id = part.lines.filter((line) => line.key === 'content-id').pop();
				if (!id || !/^image\/\w+$/i.test(part.contentType)) return [];
				const cid = valueOf(id.line).trim().replace(/^<|>$/g, '').trim();
				return [[cid, part] as const];
			}),
	);
	if (images.size === 0) return html;
	return html.replace(/\bcid:([^'"\s]{1,256})/g, (match, cid: string) => {
		const image = images.get(cid);
		return image ? `data:${image.contentType};base64,${btoa(latin1Of(bytesOf(image)))}` : match;
	});
}

/** A file of the mail, as mailparser lists it in `attachments`. */
export interface MailAttachment {
	readonly fileName?: string;
	readonly mimeType: string;
	readonly bytes: Uint8Array;
}

/**
 * The mail as mailparser `simpleParser` gives it, with `headers` as `parseRawEmail` writes them,
 * and its attachments: each part that is not inline text, as mailparser takes it.
 */
export function parseMail(raw: string): {
	mail: Record<string, unknown>;
	attachments: () => MailAttachment[];
} {
	const root = partOf(UTF8.decode(bytesOfBase64(raw)), true);
	const content = textContentOf(root);
	return {
		mail: {
			headers: Object.fromEntries(root.lines.map(({ key, line }) => [key, line])),
			...content,
			...fieldsOf(root.lines),
			html: content.html ? withImages(content.html, root) : false,
		},
		// Decoded only on request: the default output has no attachments.
		attachments: () =>
			partsOf(root)
				.filter((part) => !isMultipart(part) && !isInlineText(part))
				.map((part) => ({
					...(part.filename === undefined ? {} : { fileName: part.filename }),
					mimeType: part.contentType,
					bytes: bytesOf(part),
				})),
	};
}
