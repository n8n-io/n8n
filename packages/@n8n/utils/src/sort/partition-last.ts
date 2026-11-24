/** Stable: moves matches to the end. Returns `items` itself when nothing matches. */
export function partitionLast<T>(items: T[], predicate: (item: T) => boolean): T[] {
	const rest: T[] = [];
	const last: T[] = [];
	for (const item of items) {
		(predicate(item) ? last : rest).push(item);
	}
	if (last.length === 0) return items;

	return [...rest, ...last];
}
