type ListItem = { id: string; startedAt: Date | string | null; createdAt: Date | string };

function iso8601StringToEpochMs(value: Date | string): number {
	return new Date(value).getTime();
}

/**
 * Sort execution list items for display, newest first.
 *
 * The frontend merges pages from separate fetches (initial load, "load more",
 * auto-refresh) into one list, and sorts the merged list with this function.
 *
 * Primary key: `startedAt` (fall back to `createdAt` for executions that
 * have not started yet), descending.
 *
 * Tie-break: execution ID, descending. Older executions use a numeric ID
 * (auto-increment). Newer executions use a v2 ID, a string that contains a
 * dash. IDs of the same kind sort naturally. A v2 ID always sorts before a
 * numeric ID, because v2 IDs were introduced after numeric IDs and so are
 * always newer.
 *
 * The backend cuts its pages by `id`, not by time, so a row whose time and ID
 * disagree can sort above rows from an earlier page. Only the server's
 * `nextCursor` drives paging, so this cannot skip or repeat a row.
 */
export function compareExecutionListItems(a: ListItem, b: ListItem): number {
	const time =
		iso8601StringToEpochMs(b.startedAt ?? b.createdAt) -
		iso8601StringToEpochMs(a.startedAt ?? a.createdAt);
	if (time) return time;

	const isAV2Id = a.id.includes('-');
	const isBV2Id = b.id.includes('-');
	if (!isAV2Id && !isBV2Id) return Number(b.id) - Number(a.id);

	if (isAV2Id !== isBV2Id) return isAV2Id ? -1 : 1;

	return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
