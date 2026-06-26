import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import type { EmojiSection } from './emojiData';
import type { LucideIconMeta } from './lucideIconData';
import { useIconPickerSearch } from './useIconPickerSearch';

const emojiSections: EmojiSection[] = [
	{
		key: 'people',
		labelKey: 'iconPicker.emojiSection.people',
		emojis: [
			// "wave" lives only in keywords; "waving"/"hand" only in the label.
			{ u: '👋', l: 'Waving Hand', k: ['wave'], t: 1 },
			{ u: '😀', l: 'Grinning Face', k: ['happy'] },
		],
	},
];

// `refDebounced` initialises to the source value synchronously, so a query passed
// at creation time is reflected immediately — no timer flushing needed.
function createSearch(query: string, tone = 0) {
	return useIconPickerSearch(
		ref<Record<string, LucideIconMeta> | null>({}),
		ref<EmojiSection[]>(emojiSections),
		ref(query),
		ref<string | null>(null),
		ref(tone),
		0,
	);
}

function matchedEmojis(query: string, tone = 0) {
	const { filteredEmojiSections } = createSearch(query, tone);
	return filteredEmojiSections.value.flatMap((section) => section.emojis);
}

describe('useIconPickerSearch — emoji filtering', () => {
	it('matches a token found only in the label', () => {
		expect(matchedEmojis('grinning').map((e) => e.u)).toEqual(['😀']);
	});

	it('matches a token found only in a keyword (not the label)', () => {
		expect(matchedEmojis('wave').map((e) => e.u)).toEqual(['👋']);
	});

	it('returns all emojis when the query is empty', () => {
		expect(matchedEmojis('').map((e) => e.u)).toEqual(['👋', '😀']);
	});

	it('applies the selected skin tone to the display string', () => {
		const emojis = matchedEmojis('', 4);
		expect(emojis.find((e) => e.u === '👋')?.display).toBe('👋🏾');
		// Not skin-tone capable → display is the base emoji.
		expect(emojis.find((e) => e.u === '😀')?.display).toBe('😀');
	});
});
