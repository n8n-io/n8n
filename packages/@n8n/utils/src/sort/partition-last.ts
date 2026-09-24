/**
 * Stable partition: items that match `predicate` move after every other item, and both groups
 * keep their original order. Returns the input array itself when nothing matches, so callers can
 * rely on reference equality to detect "no change".
 */
export function partitionLast<T>(items: T[], predicate: (item: T) => boolean): T[] {
	const rest: T[] = [];
	const last: T[] = [];
	for (const item of items) {
		(predicate(item) ? last : rest).push(item);
	}
	if (last.length === 0) return items;

	return [...rest, ...last];
}
