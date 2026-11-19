/**
 * Maps the items of an array. Returns the same array when `fn` changes no item,
 * so consumers that gate on identity see no change.
 */
export function mapArray<T>(items: T[], fn: (item: T) => T): T[] {
	let changed = false;
	const next = items.map((item) => {
		const mapped = fn(item);
		if (mapped !== item) changed = true;
		return mapped;
	});
	return changed ? next : items;
}
