export type SkillSourceGroup = { sourceId: string | null; count: number };

/** Keep source groups whole. Local skills fill the remaining space and can span pages. */
export function skillGroupPage(
	groups: SkillSourceGroup[],
	collapsed: Set<string>,
	requestedPage: number,
	pageSize = Number.POSITIVE_INFINITY,
	focusSourceId?: string,
) {
	const pages: Array<Array<{ sourceId: string; count: number }>> = [[]];
	let rowsOnLastPage = 0;
	let count = 0;
	let localCount = 0;
	let focusedPage: number | undefined;
	for (const group of groups) {
		if (group.sourceId === null) {
			localCount = group.count;
			continue;
		}
		const size = collapsed.has(group.sourceId) ? 1 : Math.max(1, group.count);
		if (rowsOnLastPage > 0 && rowsOnLastPage + size > pageSize) {
			pages.push([]);
			rowsOnLastPage = 0;
		}
		pages[pages.length - 1].push({ sourceId: group.sourceId, count: group.count });
		if (group.sourceId === focusSourceId) focusedPage = pages.length - 1;
		rowsOnLastPage += size;
		count += size;
	}
	const firstLocalCount = Math.min(localCount, Math.max(0, pageSize - rowsOnLastPage));
	const pageCount = pages.length + Math.ceil((localCount - firstLocalCount) / pageSize);
	const page = Math.min(focusedPage ?? requestedPage, pageCount - 1);
	const lastSourcePage = pages.length - 1;
	const localSkip = page <= lastSourcePage ? 0 : firstLocalCount + (page - pages.length) * pageSize;
	let localTake = 0;
	if (page === lastSourcePage) localTake = firstLocalCount;
	else if (page > lastSourcePage) localTake = Math.min(pageSize, localCount - localSkip);
	return {
		groups: pages[page] ?? [],
		count: count + localCount,
		page,
		pageCount,
		localSkip,
		localTake,
	};
}
