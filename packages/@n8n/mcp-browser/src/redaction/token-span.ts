const STOPS = /[\s"'`\\<>()[\]{},;?!&#%|*·‘’“”—–…]/;

// `=` is padding after the match but an assignment before it, so `NAME=<key>`
// must not widen into the field name.
const STOPS_BEFORE = /[=]/;

// Occur inside secrets (`AQ.`, JWTs, `<id>:<secret>`), so cross them but never
// end on them.
const EDGES = /[.:]/;

// How far a span may reach past the match on either side. Bounds the scan, so a
// long undelimited run (minified script text) costs the same for every match in
// it instead of being walked end to end each time.
const MAX_REACH = 256;

export interface TokenSpan {
	span: string;
	/**
	 * False when no delimiter was found within reach, leaving `span` as just the
	 * match — which may be a fragment of the real token, so it must not become a
	 * credential.
	 */
	delimited: boolean;
}

function endsToken(char: string): boolean {
	return STOPS.test(char);
}

function endsTokenBefore(char: string): boolean {
	return endsToken(char) || STOPS_BEFORE.test(char);
}

/**
 * Snap a match out to the whole token around it, so an unanticipated prefix or
 * suffix is covered without enumerating character classes. Only trims outside
 * the original match.
 */
export function expandToTokenSpan(text: string, index: number, length: number): TokenSpan {
	const matchEnd = index + length;
	let start = index;
	let end = matchEnd;

	while (start > 0 && index - start < MAX_REACH && !endsTokenBefore(text[start - 1])) start--;
	while (end < text.length && end - matchEnd < MAX_REACH && !endsToken(text[end])) end++;

	const delimited =
		(start === 0 || endsTokenBefore(text[start - 1])) &&
		(end === text.length || endsToken(text[end]));
	if (!delimited) return { span: text.slice(index, matchEnd), delimited: false };

	while (start < index && EDGES.test(text[start])) start++;
	while (end > matchEnd && EDGES.test(text[end - 1])) end--;
	return { span: text.slice(start, end), delimited: true };
}
