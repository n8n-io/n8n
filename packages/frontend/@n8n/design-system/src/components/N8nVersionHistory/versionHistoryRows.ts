import {
	isVersionHistoryGroup,
	type VersionHistoryEntry,
	type VersionHistoryItem,
} from './VersionHistory.types';

export interface HistoryVersionRow {
	key: string;
	kind: 'version';
	isFirst: boolean;
	isLast: boolean;
	item: VersionHistoryItem;
}

export interface HistoryGroupRow {
	key: string;
	kind: 'group';
	isFirst: boolean;
	isLast: boolean;
	groupId: string;
	label: string;
	expanded: boolean;
}

export type HistoryRow = HistoryVersionRow | HistoryGroupRow;

/** Id of the group that contains the version, when the version is nested. */
export function groupIdForVersion(
	entries: VersionHistoryEntry[],
	versionId: string | undefined,
): string | undefined {
	if (!versionId) return undefined;

	for (const entry of entries) {
		if (isVersionHistoryGroup(entry) && entry.items.some((item) => item.id === versionId)) {
			return entry.id;
		}
	}

	return undefined;
}

/**
 * Flatten groups that are open.
 * Closed groups stay one row, so the virtual list does not measure hidden versions.
 */
export function buildHistoryRows(
	entries: VersionHistoryEntry[],
	expandedIds: ReadonlySet<string>,
): HistoryRow[] {
	const rows: HistoryRow[] = [];

	for (const entry of entries) {
		if (isVersionHistoryGroup(entry)) {
			const expanded = expandedIds.has(entry.id);
			rows.push({
				key: entry.id,
				kind: 'group',
				isFirst: false,
				isLast: false,
				groupId: entry.id,
				label: entry.label,
				expanded,
			});

			if (expanded) {
				for (const item of entry.items) {
					rows.push({
						key: item.id,
						kind: 'version',
						isFirst: false,
						isLast: false,
						item,
					});
				}
			}
			continue;
		}

		rows.push({
			key: entry.id,
			kind: 'version',
			isFirst: false,
			isLast: false,
			item: entry,
		});
	}

	return rows.map((row, index) => ({
		...row,
		isFirst: index === 0,
		isLast: index === rows.length - 1,
	}));
}

export function isHistoryRow(value: unknown): value is HistoryRow {
	if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
	return value.kind === 'version' || value.kind === 'group';
}
