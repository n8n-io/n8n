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

const STOP_RUN = new RegExp(`(?:${STOPS.source})+`);
const EDGE_TRIM = new RegExp(`^(?:${EDGES.source})+|(?:${EDGES.source})+$`, 'g');
// Zero-width, so padding stays on the token it belongs to: `=` ends a token only
// when more token follows. This mirrors `endsTokenBefore`, which is the leftward
// walk only — the rightward walk runs through `=` so base64 padding survives.
const ASSIGNMENT = new RegExp(`(?<=${STOPS_BEFORE.source})(?!${STOPS_BEFORE.source})`);

/**
 * Split text into whole tokens on the same delimiters `expandToTokenSpan` snaps
 * to, so a value lifted straight out of the DOM is bounded like a matched one.
 */
export function tokenize(text: string): string[] {
	return text
		.split(STOP_RUN)
		.flatMap((token) => (token.includes('=') ? token.split(ASSIGNMENT) : token))
		.map((token) => token.replace(EDGE_TRIM, ''))
		.filter(Boolean);
}

/**
 * The name sides of `NAME=value` pairs. They tokenize like any other run, so a
 * caller that reads tokens as values needs to know which ones never are. Base64
 * padding is not one: its `=` ends the run instead of separating two.
 */
export function assignmentNames(text: string): string[] {
	const names: string[] = [];
	const runs = text.split(STOP_RUN);
	runs.forEach((run, index) => {
		// A run *starting* with `=` is a separator — padding can only end one — so
		// the run before it is a name however the whitespace fell. `NAME= value` is
		// deliberately not covered: at this level it is `dGhpcw== copy` exactly.
		if (runs[index + 1]?.startsWith('=')) names.push(run.replace(EDGE_TRIM, ''));
		if (!run.includes('=')) return;
		const parts = run.split(ASSIGNMENT).filter(Boolean);
		for (const name of parts.slice(0, -1)) names.push(name.replace(EDGE_TRIM, ''));
	});
	return names.filter(Boolean);
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
