import { UserError } from '@n8n/errors';

/** ASCII control characters (0x00 to 0x1F) and DEL (0x7F). */
export const hasControlCharacter = (value: string) =>
	[...value].some((char) => {
		const code = char.charCodeAt(0);
		return code <= 0x1f || code === 0x7f;
	});

/**
 * Accepts only an absolute http or https URL without expression syntax, user information,
 * or query string.
 * The URL parser removes tabs and line breaks, so the raw value is checked first.
 */
export function validateBaseUrl(value: string): void {
	const reject = (reason: string) => {
		throw new UserError(`The base URL is not valid: ${reason}`);
	};

	if (value.includes('{{') || value.trimStart().startsWith('=')) {
		reject('it must not contain an expression.');
	}
	if (value.includes('\\')) reject('it must not contain a backslash.');
	if (hasControlCharacter(value)) reject('it must not contain a control character.');

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return reject('it must be an absolute URL.');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		reject('it must use http or https.');
	}
	// The parser drops an empty user name, so the raw authority is checked too.
	const authority = /^[^:/?#]*:\/\/([^/?#]*)/.exec(value)?.[1] ?? '';
	if (url.username !== '' || url.password !== '' || authority.includes('@')) {
		reject('it must not contain user information.');
	}
	// The parser drops an empty query string, so the raw value is checked.
	if (value.includes('?')) reject('it must not contain a query string.');
}
