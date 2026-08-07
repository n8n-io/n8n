import { describe, expect, it } from 'vitest';

import type { EmojiEntry } from './emojiData';
import { applySkinTone, emojiForTone } from './skinTone';

describe('applySkinTone', () => {
	it('appends the Fitzpatrick modifier for a simple base emoji', () => {
		expect(applySkinTone('👋', 1)).toBe('👋🏻');
		expect(applySkinTone('👋', 4)).toBe('👋🏾');
		expect(applySkinTone('👋', 5)).toBe('👋🏿');
	});

	it('replaces a trailing variation selector (VS-16) with the modifier', () => {
		// ✋️ is U+270B U+FE0F; the modifier replaces the variation selector.
		expect(applySkinTone('✋️', 1)).toBe('✋🏻');
		expect(applySkinTone('☝️', 3)).toBe('☝🏽');
	});

	it('returns the base emoji for an out-of-range tone', () => {
		expect(applySkinTone('👋', 0)).toBe('👋');
		expect(applySkinTone('👋', 6)).toBe('👋');
	});
});

describe('emojiForTone', () => {
	const derivable: EmojiEntry = { u: '👋', l: 'Waving Hand', t: 1 };
	const explicit: EmojiEntry = {
		u: '🧑‍🤝‍🧑',
		l: 'People Holding Hands',
		s: ['🧑🏻‍🤝‍🧑🏻', '🧑🏼‍🤝‍🧑🏼', '🧑🏽‍🤝‍🧑🏽', '🧑🏾‍🤝‍🧑🏾', '🧑🏿‍🤝‍🧑🏿'],
	};
	const plain: EmojiEntry = { u: '🐶', l: 'Dog Face', k: ['pet'] };

	it('returns the base emoji for tone 0', () => {
		expect(emojiForTone(derivable, 0)).toBe('👋');
		expect(emojiForTone(explicit, 0)).toBe('🧑‍🤝‍🧑');
		expect(emojiForTone(plain, 0)).toBe('🐶');
	});

	it('derives the variant at runtime for skin-tone-capable emojis', () => {
		expect(emojiForTone(derivable, 4)).toBe('👋🏾');
	});

	it('prefers explicit variants when present', () => {
		expect(emojiForTone(explicit, 2)).toBe('🧑🏼‍🤝‍🧑🏼');
		expect(emojiForTone(explicit, 5)).toBe('🧑🏿‍🤝‍🧑🏿');
	});

	it('returns the base emoji when the entry is not skin-tone capable', () => {
		expect(emojiForTone(plain, 3)).toBe('🐶');
	});
});
