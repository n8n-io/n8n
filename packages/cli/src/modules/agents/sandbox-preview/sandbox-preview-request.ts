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

/** A run of `%XX` escapes, decoded as UTF-8 bytes together. */
const ESCAPE_RUN = /(?:%[0-9a-f]{2})+/gi;

const isStrictlyDecodable = (value: string): boolean => {
	try {
		decodeURIComponent(value);
		return true;
	} catch {
		return false;
	}
};

/**
 * Decodes the valid escapes and keeps the others as text, as lenient decoders
 * do. For a value that `decodeURIComponent` accepts, the result is the same.
 */
const decodeLeniently = (value: string): string =>
	value.replace(ESCAPE_RUN, (run) => Buffer.from(run.replaceAll('%', ''), 'hex').toString('utf8'));

/**
 * A segment ends at `/` and `\`. A service that decodes the path and parses
 * it again as a URL also ends it at `?`, `#`, `;` (path parameters) and NUL.
 */
const SEGMENT_END = /[\\/?#;\0]/;

const namesParent = (value: string): boolean => value.split(SEGMENT_END).includes('..');

/**
 * Whether a segment, in any decoded form, names the parent directory. The
 * forwarded path sits below the key-bearing `/sandboxes/<id>/ports/<port>`
 * prefix, so no segment may leave it, encoded or not. Later rounds decode
 * leniently: a bad escape that only a decode reveals must not end the check.
 */
export function segmentClimbsOut(segment: string): boolean {
	// Refuse a bad escape only in the form the client sent: a decoded `%` is valid text.
	if (!isStrictlyDecodable(segment)) return true;
	let current = segment;
	for (let round = 0; round < MAX_DECODE_ROUNDS; round++) {
		if (namesParent(current)) return true;
		const decoded = decodeLeniently(current);
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

/** `Sec-Fetch-Dest` values of requests that load a document. */
const DOCUMENT_DESTINATIONS: ReadonlySet<string> = new Set([
	'document',
	'iframe',
	'frame',
	'object',
	'embed',
]);

/**
 * The frame's document, as opposed to the scripts and assets that it loads.
 * A form that the page submits also loads a new document into the frame.
 */
export function isDocumentRequest(method: string | undefined, headers: IncomingHttpHeaders) {
	const destination = headers['sec-fetch-dest'];
	if (typeof destination === 'string' && DOCUMENT_DESTINATIONS.has(destination)) return true;
	if (method !== 'GET' && method !== 'HEAD') return false;
	return headers.accept?.includes('text/html') ?? false;
}
