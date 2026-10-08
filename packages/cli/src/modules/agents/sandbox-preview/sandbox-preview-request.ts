import type { IncomingHttpHeaders } from 'node:http';

/** A request URL under the preview mount, split into the token and what to forward. */
export type PreviewRequestTarget =
	| { kind: 'invalid' }
	| { kind: 'no-token' }
	| { kind: 'token-only'; token: string; search: string }
	| { kind: 'forward'; token: string; forwardPath: string };

/**
 * A path can be decoded again after this proxy decodes it once. Refuse a
 * segment that still changes after this many decodes.
 */
const MAX_DECODE_ROUNDS = 4;

const tryDecode = (value: string): string | undefined => {
	try {
		return decodeURIComponent(value);
	} catch {
		return undefined;
	}
};

/**
 * Whether a segment, in any decoded form, names the parent directory. The
 * forwarded path sits below the key-bearing `/sandboxes/<id>/ports/<port>`
 * prefix, so no segment may leave it, encoded or not.
 */
export function segmentClimbsOut(segment: string): boolean {
	let current = segment;
	for (let round = 0; round < MAX_DECODE_ROUNDS; round++) {
		if (current.split(/[\\/]/).includes('..')) return true;
		const decoded = tryDecode(current);
		// Refuse a bad escape only in the form the client sent: a decoded `%` is valid text.
		if (decoded === undefined) return round === 0;
		if (decoded === current) return false;
		current = decoded;
	}
	return true;
}

export const hasDotDotSegment = (segments: string[]): boolean => segments.some(segmentClimbsOut);

/**
 * Splits `/<token>/<rest>?<query>`, the request URL relative to the preview
 * mount. `forwardPath` is what follows the token, query included.
 */
export function parsePreviewUrl(url: string): PreviewRequestTarget {
	const queryStart = url.indexOf('?');
	const pathname = queryStart === -1 ? url : url.slice(0, queryStart);
	const search = queryStart === -1 ? '' : url.slice(queryStart);
	const [, token = '', ...rest] = pathname.split('/');
	if (hasDotDotSegment([token, ...rest])) return { kind: 'invalid' };
	if (!token) return { kind: 'no-token' };
	if (rest.length === 0) return { kind: 'token-only', token, search };
	return { kind: 'forward', token, forwardPath: `/${rest.join('/')}${search}` };
}

/** The frame's document, as opposed to the scripts and assets that it loads. */
export function isDocumentRequest(method: string | undefined, headers: IncomingHttpHeaders) {
	if (method !== 'GET') return false;
	const destination = headers['sec-fetch-dest'];
	if (destination === 'document' || destination === 'iframe') return true;
	return headers.accept?.includes('text/html') ?? false;
}
