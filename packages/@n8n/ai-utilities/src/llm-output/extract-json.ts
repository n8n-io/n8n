const FENCED_BLOCK = /```(?:json)?\s*\n?([\s\S]*?)```/i;
const JSON_CONTAINER_START = /^[[{]/;

export function extractFencedJson(text: string): string | undefined {
	return FENCED_BLOCK.exec(text)?.[1].trim();
}

/** Outermost `{...}` or `[...]` span. An array wins only when it encloses the
 *  object (`[{...}]`), so a stray `[link]` in prose before the payload does not
 *  shadow it. */
function extractJsonContainer(text: string): string | undefined {
	const objectStart = text.indexOf('{');
	const objectEnd = text.lastIndexOf('}');
	const arrayStart = text.indexOf('[');
	const arrayEnd = text.lastIndexOf(']');
	const hasObject = objectStart !== -1 && objectEnd > objectStart;
	const hasArray = arrayStart !== -1 && arrayEnd > arrayStart;

	if (hasArray && (!hasObject || (arrayStart < objectStart && arrayEnd > objectEnd))) {
		return text.slice(arrayStart, arrayEnd + 1);
	}
	return hasObject ? text.slice(objectStart, objectEnd + 1) : undefined;
}

export function extractJsonCandidate(text: string): string {
	const trimmed = text.trim();
	// A response that already starts with a JSON container is the payload itself;
	// backtick pairs inside one of its string values must not shadow it. Elsewhere,
	// trust a fenced block only when it is JSON-shaped, for the same reason.
	const fenced = JSON_CONTAINER_START.test(trimmed) ? undefined : extractFencedJson(trimmed);
	if (fenced !== undefined && JSON_CONTAINER_START.test(fenced)) return fenced;

	return extractJsonContainer(trimmed) ?? fenced ?? trimmed;
}
