import path from 'node:path';

const DOT_SEGMENT = /^\.{1,2}$/;
const DOTS_AND_SPACES = /^[. ]+$/;
const TRAILING_DOTS_AND_SPACES = /[. ]+$/;
const TRAILING_SPACES = / +$/;

/** Percent-decodes a request path, or `null` for a malformed percent sequence. */
function tryDecode(requestPath: string): string | null {
	try {
		return decodeURIComponent(requestPath);
	} catch {
		return null;
	}
}

function toSegments(decoded: string): string[] {
	return decoded.replace(/\\/g, '/').split('/');
}

/** Trims trailing spaces first, so a segment that is then `.` or `..` stays a dot segment. */
function trimSegment(segment: string): string {
	const withoutTrailingSpaces = segment.replace(TRAILING_SPACES, '');
	if (DOT_SEGMENT.test(withoutTrailingSpaces)) return withoutTrailingSpaces;

	return withoutTrailingSpaces.replace(TRAILING_DOTS_AND_SPACES, '');
}

function normalizeSegments(segments: string[]): string {
	const trimmed = segments.map(trimSegment).filter((segment) => segment !== '');

	return path.posix.normalize(`/${trimmed.join('/')}`).toLowerCase();
}

/**
 * Normalises a request path into the form a filesystem-backed static handler
 * would resolve it to, lower-cased, for comparison against a known route prefix.
 */
export function normalize(requestPath: string): string {
	const decoded = tryDecode(requestPath) ?? requestPath;

	return normalizeSegments(toSegments(decoded));
}

/**
 * Whether a request path can reach `directory` under any reading of the path.
 * A segment with no single reading counts as reaching it, as does a malformed
 * percent sequence anywhere in the path.
 */
export function mayReachDirectory(requestPath: string, directory: string): boolean {
	const decoded = tryDecode(requestPath);
	if (decoded === null) return true;

	const lowerDirectory = directory.toLowerCase();
	const segments = toSegments(decoded);
	const normalized = normalizeSegments(segments);
	if (normalized === `/${lowerDirectory}` || normalized.startsWith(`/${lowerDirectory}/`)) {
		return true;
	}

	let hasUnreadableSegment = false;
	let matchesDirectory = false;
	for (const segment of segments) {
		if (DOTS_AND_SPACES.test(segment) && !DOT_SEGMENT.test(segment)) hasUnreadableSegment = true;
		if (trimSegment(segment).toLowerCase() === lowerDirectory) matchesDirectory = true;
	}

	return hasUnreadableSegment && matchesDirectory;
}
