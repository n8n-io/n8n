const MIN_TERM_LENGTH = 3;
const MAX_MATCHES = 5;

/** Splits camelCase ("slackApi" gives "slack", "api"), then keeps whole words, lowercased. */
const splitCamelCase = (text: string): string => text.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2');

/** A trailing "s" is dropped from longer words, so "files" and "file" meet. */
const stem = (word: string): string =>
	word.length > MIN_TERM_LENGTH && word.endsWith('s') ? word.slice(0, -1) : word;

const words = (text: string): string[] =>
	(
		splitCamelCase(text)
			.toLowerCase()
			.match(/[\p{L}\p{N}]+/gu) ?? []
	).map(stem);

/** The words of a type name, split and whole, so "readBinaryFile" also answers "readbinaryfile". */
const nameWordsOf = (text: string): string[] => [
	...words(text),
	...(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).map(stem),
];

/**
 * Restricted types that the user's search words name. Every word of the query must be a whole
 * word of the type's display name or type name, so "gmail" finds "Gmail Trigger" and a loose
 * description hit never raises a notice for a type nobody asked about.
 *
 * Words shorter than three letters are ignored, so they cannot match by chance. A query made only
 * of such words ("if") matches just a type whose display name is exactly those words. When more
 * than five types match, the ones whose display name is exactly the query come first.
 */
export function matchRestrictedByQuery<T extends { displayName: string }>(
	query: string,
	restricted: readonly T[],
	typeName: (item: T) => string,
): T[] {
	const queryWords = words(query);
	if (queryWords.length === 0) return [];

	const terms = queryWords.filter((term) => term.length >= MIN_TERM_LENGTH);
	const wanted = queryWords.join(' ');
	const isExact = (item: T) => words(item.displayName).join(' ') === wanted;

	const matches =
		terms.length === 0
			? restricted.filter(isExact)
			: restricted.filter((item) => {
					const nameWords = new Set([
						...nameWordsOf(item.displayName),
						...nameWordsOf(typeName(item)),
					]);
					return terms.every((term) => nameWords.has(term));
				});

	return [...matches.filter(isExact), ...matches.filter((item) => !isExact(item))].slice(
		0,
		MAX_MATCHES,
	);
}

/** Who restricted a type, in the words that tool results and notes use. */
export function describeRestrictionScope(scope: 'instance' | 'project'): string {
	return scope === 'instance' ? 'an instance policy' : "this project's policy";
}
