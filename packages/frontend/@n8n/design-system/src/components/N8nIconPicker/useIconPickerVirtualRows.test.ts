import { describe, expect, it } from 'vitest';

import type { LucideIconMeta } from './lucideIconData';
import type { DisplayEmojiSection } from './useIconPickerSearch';
import {
	buildIconBrowseRows,
	buildIconSearchRows,
	buildEmojiRows,
	getStickyHeaderLabelKey,
} from './useIconPickerVirtualRows';

function iconMeta(): LucideIconMeta {
	return { keywords: [], categories: [] };
}

describe('useIconPickerVirtualRows', () => {
	it('builds browse rows with headers and 10-icon chunks', () => {
		const rows = buildIconBrowseRows([
			{
				key: 'design',
				labelKey: 'iconPicker.iconSection.design',
				icons: Array.from({ length: 12 }, (_, index) => [`icon-${index + 1}`, iconMeta()]),
			},
		]);

		expect(rows).toHaveLength(3);
		expect(rows[0]).toMatchObject({
			type: 'header',
			labelKey: 'iconPicker.iconSection.design',
		});
		expect(rows[1]).toMatchObject({
			type: 'icon-row',
			iconNames: [
				'icon-1',
				'icon-2',
				'icon-3',
				'icon-4',
				'icon-5',
				'icon-6',
				'icon-7',
				'icon-8',
				'icon-9',
				'icon-10',
			],
		});
		expect(rows[2]).toMatchObject({
			type: 'icon-row',
			iconNames: ['icon-11', 'icon-12'],
		});
	});

	it('builds search rows without headers', () => {
		const rows = buildIconSearchRows(
			Array.from({ length: 11 }, (_, index) => [`search-icon-${index + 1}`, iconMeta()]),
		);

		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			type: 'icon-row',
			iconNames: [
				'search-icon-1',
				'search-icon-2',
				'search-icon-3',
				'search-icon-4',
				'search-icon-5',
				'search-icon-6',
				'search-icon-7',
				'search-icon-8',
				'search-icon-9',
				'search-icon-10',
			],
		});
		expect(rows[1]).toMatchObject({
			type: 'icon-row',
			iconNames: ['search-icon-11'],
		});
	});

	it('builds emoji rows with headers and emoji chunks', () => {
		const rows = buildEmojiRows([
			{
				key: 'people',
				labelKey: 'iconPicker.emojiSection.people',
				emojis: Array.from({ length: 11 }, (_, index) => ({
					u: `😀${index}`,
					l: `Emoji ${index + 1}`,
					k: [],
					display: `😀${index}`,
				})),
			} satisfies DisplayEmojiSection,
		]);

		expect(rows).toHaveLength(3);
		expect(rows[0]).toMatchObject({
			type: 'header',
			labelKey: 'iconPicker.emojiSection.people',
		});
		expect(rows[1]).toMatchObject({
			type: 'emoji-row',
		});
		expect(rows[2]).toMatchObject({
			type: 'emoji-row',
		});
	});

	it('derives the sticky header label from the nearest previous header row', () => {
		const rows = buildIconBrowseRows([
			{
				key: 'design',
				labelKey: 'iconPicker.iconSection.design',
				icons: Array.from({ length: 3 }, (_, index) => [`design-${index + 1}`, iconMeta()]),
			},
			{
				key: 'shapes',
				labelKey: 'iconPicker.iconSection.shapes',
				icons: Array.from({ length: 3 }, (_, index) => [`shape-${index + 1}`, iconMeta()]),
			},
		]);

		expect(getStickyHeaderLabelKey(rows, 0)).toBe('iconPicker.iconSection.design');
		expect(getStickyHeaderLabelKey(rows, 1)).toBe('iconPicker.iconSection.design');
		expect(getStickyHeaderLabelKey(rows, 3)).toBe('iconPicker.iconSection.shapes');
		expect(getStickyHeaderLabelKey(buildIconSearchRows([]), 0)).toBeNull();
	});
});
