import { UserError } from '@n8n/node-sdk';

const FILE_ID = '[-_a-zA-Z0-9]+';

/**
 * A Google file ID, or a Docs or Drive URL with the ID after `/d/`, as the legacy nodes read it
 * (`GOOGLE_DRIVE_FILE_URL_REGEX`). An ID has no fixed length. A name with spaces does not match.
 */
export const GOOGLE_FILE_ID = `^(?:${FILE_ID}|(?:https?://)?(?:docs|drive)\\.google\\.com(?:/[^?#]*)?/d/${FILE_ID}(?:[/?#].*)?)$`;

/** The ID after `/d/` in a Google file URL, as the first group. */
export const GOOGLE_FILE_URL_ID = `/d/(${FILE_ID})`;

/** The ID in a Google file URL, else the value itself. It goes into a path, so it is checked. */
export function googleFileIdOf(value: string, service: string) {
	const id = new RegExp(GOOGLE_FILE_URL_ID).exec(value)?.[1] ?? value;
	if (!new RegExp(`^${FILE_ID}$`).test(id)) {
		throw new UserError(`Not a ${service} ID or URL: ${value}`);
	}
	return id;
}
