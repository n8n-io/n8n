import { refDebounced } from '@vueuse/core';
import { computed, type Ref } from 'vue';

import type { EmojiSection, EmojiEntry } from './emojiData';
import { ICON_CATEGORIES, OTHER_CATEGORY, getPrimaryCategoryKey } from './iconCategories';
import type { LucideIcon } from './lucideIconData';

export interface DisplayEmojiEntry extends EmojiEntry {
	/** The emoji to display (with skin tone applied if applicable) */
	display: string;
}

export interface DisplayEmojiSection {
	key: string;
	labelKey: string;
	emojis: DisplayEmojiEntry[];
}

export interface IconSection {
	key: string;
	labelKey: string;
	icons: Array<[string, LucideIcon]>;
}

export function useIconPickerSearch(
	lucideData: Ref<Record<string, LucideIcon> | null>,
	emojiSectionsData: Ref<EmojiSection[]>,
	query: Ref<string>,
	selectedCategory: Ref<string | null>,
	selectedSkinTone: Ref<number>,
	delay = 150,
) {
	const debouncedQuery = refDebounced(query, delay);

	/** Flat filtered icon list — used when search is active */
	const filteredIcons = computed<Array<[string, LucideIcon]>>(() => {
		if (!lucideData.value) return [];
		let entries = Object.entries(lucideData.value);

		// Filter by category if selected
		if (selectedCategory.value) {
			const cat = selectedCategory.value;
			entries = entries.filter(([, icon]) => icon.categories.includes(cat));
		}

		// Filter by search query
		const q = debouncedQuery.value.toLowerCase().trim();
		if (q) {
			entries = entries.filter(
				([name, icon]) => name.includes(q) || icon.keywords.some((kw) => kw.includes(q)),
			);
		}

		return entries;
	});

	/**
	 * Icons grouped by category — used when browsing (no search query).
	 * Each icon appears in exactly one section based on its primary category
	 * (first recognized slug in its categories array).
	 * Sections are ordered to match the official Lucide categories page.
	 */
	const filteredIconSections = computed<IconSection[]>(() => {
		if (!lucideData.value) return [];
		const entries = Object.entries(lucideData.value);

		// Group icons by their primary category
		const categoryMap = new Map<string, Array<[string, LucideIcon]>>();
		for (const entry of entries) {
			const catKey = getPrimaryCategoryKey(entry[1].categories);
			let bucket = categoryMap.get(catKey);
			if (!bucket) {
				bucket = [];
				categoryMap.set(catKey, bucket);
			}
			bucket.push(entry);
		}

		// Build sections in defined order, skip empty ones
		const sections: IconSection[] = [];
		for (const def of ICON_CATEGORIES) {
			const icons = categoryMap.get(def.key);
			if (icons && icons.length > 0) {
				sections.push({ key: def.key, labelKey: def.labelKey, icons });
			}
		}

		// Add "Other" for uncategorized icons at the end
		const otherIcons = categoryMap.get('other');
		if (otherIcons && otherIcons.length > 0) {
			sections.push({
				key: OTHER_CATEGORY.key,
				labelKey: OTHER_CATEGORY.labelKey,
				icons: otherIcons,
			});
		}

		return sections;
	});

	const filteredEmojiSections = computed<DisplayEmojiSection[]>(() => {
		const q = debouncedQuery.value.toLowerCase().trim();
		const tone = selectedSkinTone.value;

		return emojiSectionsData.value
			.map((section) => {
				let emojis = section.emojis;
				if (q) {
					emojis = emojis.filter((e) => e.k.some((kw) => kw.includes(q)));
				}
				// Apply skin tone to display
				const displayEmojis: DisplayEmojiEntry[] = emojis.map((e) => ({
					...e,
					display: tone > 0 && e.s ? e.s[tone - 1] : e.u,
				}));
				return { key: section.key, labelKey: section.labelKey, emojis: displayEmojis };
			})
			.filter((section) => section.emojis.length > 0);
	});

	return { filteredIcons, filteredIconSections, filteredEmojiSections, debouncedQuery };
}
