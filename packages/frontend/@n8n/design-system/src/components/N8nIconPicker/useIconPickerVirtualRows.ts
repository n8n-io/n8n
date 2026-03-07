import type { LucideIconMeta } from './lucideIconData';
import type { DisplayEmojiEntry, DisplayEmojiSection, IconSection } from './useIconPickerSearch';

const DEFAULT_COLUMNS = 10;

type IconSectionRowBase = {
	sectionKey: string;
	labelKey: string;
};

export type IconPickerHeaderRow = IconSectionRowBase & {
	id: string;
	type: 'header';
};

export type IconPickerIconRow = Partial<IconSectionRowBase> & {
	id: string;
	type: 'icon-row';
	iconNames: string[];
};

export type IconPickerEmojiRow = IconSectionRowBase & {
	id: string;
	type: 'emoji-row';
	emojis: DisplayEmojiEntry[];
};

export type IconPickerVirtualRow =
	| IconPickerHeaderRow
	| IconPickerIconRow
	| IconPickerEmojiRow;

function chunkItems<T>(items: T[], columns: number): T[][] {
	const rows: T[][] = [];

	for (let index = 0; index < items.length; index += columns) {
		rows.push(items.slice(index, index + columns));
	}

	return rows;
}

export function buildIconBrowseRows(
	sections: IconSection[],
	columns = DEFAULT_COLUMNS,
): IconPickerVirtualRow[] {
	const rows: IconPickerVirtualRow[] = [];

	for (const section of sections) {
		rows.push({
			id: `header-${section.key}`,
			type: 'header',
			sectionKey: section.key,
			labelKey: section.labelKey,
		});

		for (const [rowIndex, row] of chunkItems(section.icons, columns).entries()) {
			rows.push({
				id: `icons-${section.key}-${rowIndex}`,
				type: 'icon-row',
				sectionKey: section.key,
				labelKey: section.labelKey,
				iconNames: row.map(([name]) => name),
			});
		}
	}

	return rows;
}

export function buildIconSearchRows(
	icons: Array<[string, LucideIconMeta]>,
	columns = DEFAULT_COLUMNS,
): IconPickerVirtualRow[] {
	return chunkItems(icons, columns).map((row, rowIndex) => ({
		id: `search-icons-${rowIndex}`,
		type: 'icon-row',
		iconNames: row.map(([name]) => name),
	}));
}

export function buildEmojiRows(
	sections: DisplayEmojiSection[],
	columns = DEFAULT_COLUMNS,
): IconPickerVirtualRow[] {
	const rows: IconPickerVirtualRow[] = [];

	for (const section of sections) {
		rows.push({
			id: `header-${section.key}`,
			type: 'header',
			sectionKey: section.key,
			labelKey: section.labelKey,
		});

		for (const [rowIndex, row] of chunkItems(section.emojis, columns).entries()) {
			rows.push({
				id: `emojis-${section.key}-${rowIndex}`,
				type: 'emoji-row',
				sectionKey: section.key,
				labelKey: section.labelKey,
				emojis: row,
			});
		}
	}

	return rows;
}

export function getStickyHeaderLabelKey(
	rows: IconPickerVirtualRow[],
	firstVisibleIndex: number,
): string | null {
	const clampedIndex = Math.min(Math.max(firstVisibleIndex, 0), rows.length - 1);

	for (let index = clampedIndex; index >= 0; index--) {
		const row = rows[index];
		if (row?.type === 'header') {
			return row.labelKey;
		}
	}

	return null;
}
