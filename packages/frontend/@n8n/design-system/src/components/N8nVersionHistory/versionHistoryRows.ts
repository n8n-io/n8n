import {
	isVersionHistoryGroup,
	isVersionHistoryHeading,
	type VersionHistoryEntry,
	type VersionHistoryItem,
} from './VersionHistory.types';

interface HistoryRowEnds {
	isFirst: boolean;
	isLast: boolean;
	/** Line from the previous mark to this mark. */
	connectAbove: boolean;
	/** Line from this mark to the next mark. */
	connectBelow: boolean;
}

export interface HistoryVersionRow extends HistoryRowEnds {
	key: string;
	kind: 'version';
	item: VersionHistoryItem;
}

export interface HistoryGroupRow extends HistoryRowEnds {
	key: string;
	kind: 'group';
	groupId: string;
	label: string;
	expanded: boolean;
}

export interface HistoryHeadingRow extends HistoryRowEnds {
	key: string;
	kind: 'heading';
	label: string;
}

export type HistoryRow = HistoryVersionRow | HistoryGroupRow | HistoryHeadingRow;

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
	const rows: Array<Omit<HistoryRow, 'isFirst' | 'isLast' | 'connectAbove' | 'connectBelow'>> = [];

	for (const entry of entries) {
		if (isVersionHistoryHeading(entry)) {
			rows.push({
				key: entry.id,
				kind: 'heading',
				label: entry.label,
			});
			continue;
		}

		if (isVersionHistoryGroup(entry)) {
			const expanded = expandedIds.has(entry.id);
			rows.push({
				key: entry.id,
				kind: 'group',
				groupId: entry.id,
				label: entry.label,
				expanded,
			});

			if (expanded) {
				for (const item of entry.items) {
					rows.push({
						key: item.id,
						kind: 'version',
						item,
					});
				}
			}
			continue;
		}

		rows.push({
			key: entry.id,
			kind: 'version',
			item: entry,
		});
	}

	return rows.map((row, index) => {
		const previous = rows[index - 1];
		const next = rows[index + 1];
		const isHeading = row.kind === 'heading';
		// A heading ends the line. The next mark starts a new one.
		const connectAbove = !isHeading && previous !== undefined && previous.kind !== 'heading';
		const connectBelow = !isHeading && next !== undefined && next.kind !== 'heading';

		return {
			...row,
			isFirst: index === 0,
			isLast: index === rows.length - 1,
			connectAbove,
			connectBelow,
		};
	});
}

export function isHistoryRow(value: unknown): value is HistoryRow {
	if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
	return value.kind === 'version' || value.kind === 'group' || value.kind === 'heading';
}
