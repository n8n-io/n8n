const MIN_TERM_LENGTH = 3;
const MAX_MATCHES = 5;

const words = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/**
 * Restricted types that the user's search words name. Every word of the query must be a whole
 * word of the type's display name or type name, so "gmail" finds "Gmail Trigger" and a loose
 * description hit never raises a notice for a type nobody asked about.
 *
 * Words shorter than three letters are ignored, so they cannot match by chance. A query made only
 * of such words ("if") matches just a type whose display name is exactly those words.
 */
export function matchRestrictedByQuery<T extends { displayName: string }>(
	query: string,
	restricted: readonly T[],
	typeName: (item: T) => string,
): T[] {
	const queryWords = words(query);
	const terms = queryWords.filter((term) => term.length >= MIN_TERM_LENGTH);
	if (queryWords.length === 0) return [];

	if (terms.length === 0) {
		const wanted = queryWords.join(' ');
		return restricted
			.filter((item) => words(item.displayName).join(' ') === wanted)
			.slice(0, MAX_MATCHES);
	}

	return restricted
		.filter((item) => {
			const nameWords = new Set([...words(item.displayName), ...words(typeName(item))]);
			return terms.every((term) => nameWords.has(term));
		})
		.slice(0, MAX_MATCHES);
}

/** Who restricted a type, in the words that tool results and notes use. */
export function describeRestrictionScope(scope: 'instance' | 'project'): string {
	return scope === 'instance' ? 'an instance policy' : "this project's policy";
}
