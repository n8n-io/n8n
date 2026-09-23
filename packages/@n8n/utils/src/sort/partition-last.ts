/**
 * Stable partition: items that match `predicate` move after every other item, and both groups
 * keep their original order. Returns the input array itself when nothing matches, so callers can
 * rely on reference equality to detect "no change".
 */
export function partitionLast<T>(items: T[], predicate: (item: T) => boolean): T[] {
	const last = items.filter(predicate);
	if (last.length === 0) return items;

	return [...items.filter((item) => !predicate(item)), ...last];
}
