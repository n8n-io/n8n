type ListItem = { id: string; startedAt: Date | string | null; createdAt: Date | string };

function iso8601StringToEpochMs(value: Date | string): number {
	return new Date(value).getTime();
}

/** Keep display order equal to the order used to merge source pages. */
export function compareExecutionListItems(a: ListItem, b: ListItem): number {
	const time =
		iso8601StringToEpochMs(b.startedAt ?? b.createdAt) -
		iso8601StringToEpochMs(a.startedAt ?? a.createdAt);
	if (time) return time;
	const aV2 = a.id.includes('-');
	const bV2 = b.id.includes('-');
	if (aV2 !== bV2) return aV2 ? -1 : 1;
	if (!aV2) return Number(b.id) - Number(a.id);
	return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
