export type SkillSourceGroup = { sourceId: string | null; count: number };

/** Slice skills in source order. Headers and fold state do not change page boundaries. */
export function skillGroupPage(
	groups: SkillSourceGroup[],
	requestedPage: number,
	pageSize = Number.POSITIVE_INFINITY,
	focusSourceId?: string,
) {
	let count = 0;
	let focusedOffset: number | undefined;
	for (const group of groups) {
		if (group.sourceId === focusSourceId) focusedOffset = count;
		count += group.count;
	}
	const pageCount = Math.max(1, Math.ceil(count / pageSize));
	const page = Math.min(
		focusedOffset === undefined ? requestedPage : Math.floor(focusedOffset / pageSize),
		pageCount - 1,
	);
	// An unlimited first page must not multiply zero by infinity.
	const start = page === 0 ? 0 : page * pageSize;
	const end = start + pageSize;
	const sourceGroups: Array<{ sourceId: string; count: number; skip: number; take: number }> = [];
	let offset = 0;
	let localSkip = 0;
	let localTake = 0;
	for (const group of groups) {
		const skip = Math.max(0, start - offset);
		const take = Math.max(0, Math.min(offset + group.count, end) - Math.max(offset, start));
		if (group.sourceId === null) {
			localSkip = Math.min(skip, group.count);
			localTake = take;
		} else {
			// Empty sources stay beside the next skill, or on the last page if none follows.
			const emptyPage = Math.min(Math.floor(offset / pageSize), pageCount - 1);
			if (take > 0 || (group.count === 0 && page === emptyPage)) {
				sourceGroups.push({ sourceId: group.sourceId, count: group.count, skip, take });
			}
		}
		offset += group.count;
	}
	return { groups: sourceGroups, count, page, pageCount, localSkip, localTake };
}
