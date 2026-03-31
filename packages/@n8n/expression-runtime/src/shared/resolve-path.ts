/**
 * Resolve a property path against the host-side data object.
 *
 * Same navigation logic as the getValueAtPath callback, including the
 * $item special case. Used to resolve proxy-result sentinels without
 * crossing the isolate boundary.
 */
export function resolvePathInData(data: Record<string, unknown>, path: string[]): unknown {
	let value: unknown = data;
	let startIndex = 0;
	const itemFn = data.$item;
	if (path.length >= 2 && path[0] === '$item' && typeof itemFn === 'function') {
		const itemIndex = parseInt(path[1], 10);
		if (!isNaN(itemIndex)) {
			value = (itemFn as (i: number) => unknown)(itemIndex);
			startIndex = 2;
		}
	}
	for (let i = startIndex; i < path.length; i++) {
		value = (value as Record<string, unknown>)?.[path[i]];
		if (value === undefined || value === null) {
			return value;
		}
	}
	return value;
}
