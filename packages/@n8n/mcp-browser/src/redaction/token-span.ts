const STOPS = /[\s"'`\\<>()[\]{},;?!&#%|*·‘’“”—–]/;

// `=` is padding after the match but an assignment before it, so `NAME=<key>`
// must not widen into the field name.
const STOPS_LEFT = /[=]/;

// Occur inside secrets (`AQ.`, JWTs, `<id>:<secret>`), so cross them but never
// end on them.
const EDGES = /[.:]/;

// Past this, the token ran into something undelimitable (minified script text)
// and the match is the safer answer.
const MAX_SPAN = 512;

export interface TokenSpan {
	span: string;
	/** False when the run had no delimiter within `MAX_SPAN`, so `span` is only
	 * the match and may be a fragment of the real token. */
	delimited: boolean;
}

/**
 * Snap a match out to the whole token around it, so an unanticipated prefix or
 * suffix is covered without enumerating character classes. Only trims outside
 * the original match.
 */
export function expandToTokenSpan(text: string, index: number, length: number): TokenSpan {
	let start = index;
	let end = index + length;
	while (start > 0 && !STOPS.test(text[start - 1]) && !STOPS_LEFT.test(text[start - 1])) start--;
	while (end < text.length && !STOPS.test(text[end])) end++;
	while (start < index && EDGES.test(text[start])) start++;
	while (end > index + length && EDGES.test(text[end - 1])) end--;
	if (end - start > MAX_SPAN) {
		return { span: text.slice(index, index + length), delimited: false };
	}
	return { span: text.slice(start, end), delimited: true };
}
