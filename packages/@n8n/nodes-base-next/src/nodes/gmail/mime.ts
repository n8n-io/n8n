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
