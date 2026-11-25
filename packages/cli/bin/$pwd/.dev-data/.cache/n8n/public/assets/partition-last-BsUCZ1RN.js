//#region ../../@n8n/utils/src/sort/partition-last.ts
/** Stable: moves matches to the end. Returns `items` itself when nothing matches. */
function partitionLast(items, predicate) {
	const rest = [];
	const last = [];
	for (const item of items) (predicate(item) ? last : rest).push(item);
	if (last.length === 0) return items;
	return [...rest, ...last];
}
//#endregion
export { partitionLast as t };
