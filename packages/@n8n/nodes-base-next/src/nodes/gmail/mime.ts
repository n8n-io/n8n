import type { Binary } from '@n8n/node-sdk';

/** Header values stay on one line. */
export const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ');

const PRINTABLE = /^[\x20-\x7e]*$/;

/** RFC 5322 atext and spaces: a display name with only these needs no quotes. */
const PLAIN_NAME = /^[\w !#$%&'*+\-/=?^`{|}~]*$/;

/** 45 bytes encode to 60 base64 characters, so each word stays within 75 characters. */
const WORD_BYTES = 45;

/**
 * RFC 2047 encoded words for text outside printable ASCII. A character never splits across
 * two words, and the words fold onto continuation lines.
 */
export function encodeWords(value: string): string {
	if (PRINTABLE.test(value)) return value;
	const chunks = [...value].reduce<string[]>((words, char) => {
		const last = words[words.length - 1] ?? '';
		return Buffer.byteLength(last + char) > WORD_BYTES
			? [...words, char]
			: [...words.slice(0, -1), last + char];
	}, []);
	return chunks
		.map((chunk) => `=?UTF-8?B?${Buffer.from(chunk).toString('base64')}?=`)
		.join('\r\n ');
}

/** A display name that a comma, a quote or another special character cannot split. */
export function displayName(name: string): string {
	const text = oneLine(name);
	if (!PRINTABLE.test(text)) return encodeWords(text);
	return PLAIN_NAME.test(text) ? text : `"${text.replace(/["\\]/g, '\\$&')}"`;
}

/** An address, a quoted string, or an angle-bracket part, up to the next comma outside them. */
const ADDRESS = /(?:"(?:[^"\\]|\\.)*"|<[^>]*>|[^,])+/g;

/** Like `prepareEmailsInput` in nodes-base Gmail/GenericFunctions.ts, but a quoted comma stays. */
export function addressList(value: string, field: string) {
	const entries = (value.match(ADDRESS) ?? [])
		.map((entry) => oneLine(entry.trim()))
		.filter((entry) => entry !== '');
	const invalid = entries.find((entry) => !entry.includes('@'));
	if (invalid !== undefined || entries.length === 0) {
		throw new Error(
			`Invalid email address: '${invalid ?? value}' in the '${field}' field isn't valid`,
		);
	}
	return entries.join(', ');
}

/** Each line holds 57 bytes as 76 base64 characters. */
const LINE_BYTES = 57;

const base64Lines = (bytes: Buffer) =>
	(bytes.toString('base64').match(/.{1,76}/g) ?? []).map((line) => `${line}\r\n`).join('');

/** Base64 lines of a stream. A chunk boundary never splits a 3-byte group. */
async function* base64Stream(chunks: AsyncIterable<Uint8Array>): AsyncGenerator<string> {
	const rest = { bytes: Buffer.alloc(0) };
	for await (const chunk of chunks) {
		const bytes = Buffer.concat([rest.bytes, chunk]);
		const whole = bytes.length - (bytes.length % LINE_BYTES);
		rest.bytes = bytes.subarray(whole);
		if (whole > 0) yield base64Lines(bytes.subarray(0, whole));
	}
	yield base64Lines(rest.bytes);
}

/** `name="a.pdf"`, or the RFC 2231 form for a name that needs escaping. */
const parameter = (name: string, value: string) =>
	/^[\x20-\x7e]*$/.test(value) && !/["\\]/.test(value)
		? `${name}="${value}"`
		: `${name}*=UTF-8''${encodeURIComponent(value)}`;

/** No base64 line and no encoded word can hold "=_", so the boundary needs no random part. */
const BOUNDARY = '=_n8n_mixed';

/**
 * A multipart/mixed message: the text, then each attachment. It streams, so an attachment
 * never sits in memory as a whole.
 */
export async function* mixedMessage(
	headers: ReadonlyArray<readonly [string, string | undefined]>,
	text: { readonly type: string; readonly content: string },
	attachments: readonly Binary[],
): AsyncGenerator<string> {
	const head = (fields: ReadonlyArray<readonly [string, string | undefined]>) =>
		fields.flatMap(([name, value]) => (value ? [`${name}: ${value}\r\n`] : [])).join('');
	yield head([...headers, ['Content-Type', `multipart/mixed; boundary="${BOUNDARY}"`]]);
	yield `\r\n--${BOUNDARY}\r\n`;
	yield head([
		['Content-Type', text.type],
		['Content-Transfer-Encoding', 'base64'],
	]);
	yield `\r\n${base64Lines(Buffer.from(text.content))}`;
	for (const file of attachments) {
		const fileName = oneLine(file.meta.fileName ?? 'attachment');
		yield `--${BOUNDARY}\r\n`;
		yield head([
			['Content-Type', `${oneLine(file.meta.mimeType)}; ${parameter('name', fileName)}`],
			['Content-Disposition', `attachment; ${parameter('filename', fileName)}`],
			['Content-Transfer-Encoding', 'base64'],
		]);
		yield '\r\n';
		yield* base64Stream(file.read());
	}
	yield `--${BOUNDARY}--\r\n`;
}
