import { UserError } from '@n8n/errors';

/** The largest icon the service stores, in bytes after base64 decoding. */
export const MAX_ICON_BYTES = 256 * 1024;

const DATA_URI_PATTERN = /^data:(image\/png|image\/svg\+xml);base64,([A-Za-z0-9+/]*={0,2})$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * An SVG icon is static markup. These patterns match content that runs code or embeds
 * other documents: script elements, event attributes, `javascript:` URLs and `foreignObject`.
 */
const SVG_REJECT_PATTERNS: RegExp[] = [
	/<script/i,
	/<foreignObject/i,
	/javascript:/i,
	// An attribute name that starts with "on", after whitespace or a slash inside a tag.
	/[\s/]on[a-z]*\s*=/i,
];

export type IconMimeType = 'image/png' | 'image/svg+xml';

function isIconMimeType(value: string): value is IconMimeType {
	return value === 'image/png' || value === 'image/svg+xml';
}

/** Decodes and checks an icon data URI. Accepts only base64 PNG and base64 SVG. */
export function validateIcon(iconDataUri: string): { mimeType: IconMimeType; data: Buffer } {
	const match = DATA_URI_PATTERN.exec(iconDataUri);
	if (!match || !isIconMimeType(match[1])) {
		throw new UserError('The icon must be a base64 data URI of a PNG or SVG image.');
	}
	const mimeType = match[1];
	const base64 = match[2];
	if (base64.length % 4 !== 0) {
		throw new UserError('The icon data is not valid base64.');
	}
	// Check the encoded length first, so that a very large value is not decoded.
	if ((base64.length / 4) * 3 > MAX_ICON_BYTES + 2) {
		throw new UserError('The icon is larger than 256 KiB.');
	}
	const data = Buffer.from(base64, 'base64');
	if (data.length === 0) throw new UserError('The icon is empty.');
	if (data.length > MAX_ICON_BYTES) throw new UserError('The icon is larger than 256 KiB.');

	if (mimeType === 'image/png') {
		if (!data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
			throw new UserError('The icon is not a PNG image.');
		}
		return { mimeType, data };
	}

	let text: string;
	try {
		text = new TextDecoder('utf-8', { fatal: true }).decode(data);
	} catch {
		throw new UserError('The SVG icon is not UTF-8 text.');
	}
	if (!/<svg[\s>]/i.test(text)) {
		throw new UserError('The SVG icon has no svg element.');
	}
	if (SVG_REJECT_PATTERNS.some((pattern) => pattern.test(text))) {
		throw new UserError(
			'The SVG icon must contain only static markup: no scripts, event attributes, javascript: links or foreignObject.',
		);
	}
	return { mimeType, data };
}
