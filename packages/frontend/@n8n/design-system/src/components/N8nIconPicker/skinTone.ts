import type { EmojiEntry } from './emojiData';

/**
 * Fitzpatrick skin-tone modifiers, indexed 0–4 for tones 1–5
 * (light, medium-light, medium, medium-dark, dark).
 */
const SKIN_TONE_MODIFIERS = [
	'\u{1F3FB}',
	'\u{1F3FC}',
	'\u{1F3FD}',
	'\u{1F3FE}',
	'\u{1F3FF}',
] as const;

/** Emoji presentation selector (VS-16); a skin-tone modifier replaces it. */
const VARIATION_SELECTOR_16 = '\u{FE0F}';

/**
 * Apply a skin-tone modifier (tone 1–5) to a single-person base emoji.
 *
 * The modifier is inserted immediately after the first code point. If that code
 * point is followed by the emoji variation selector (U+FE0F), the modifier
 * replaces it — e.g. "✋️" (U+270B U+FE0F) → "✋🏻" (U+270B U+1F3FB).
 *
 * Multi-person sequences (e.g. couples, people holding hands) are NOT derivable
 * this way; the generator stores explicit variants for those (see `EmojiEntry.s`),
 * validating every derived variant against emojibase at generation time.
 *
 * Keep in sync with the `applySkinTone` helper in
 * `scripts/generate-emoji-data.mjs`.
 */
export function applySkinTone(unicode: string, toneIndex: number): string {
	const modifier = SKIN_TONE_MODIFIERS[toneIndex - 1];
	if (!modifier) return unicode;

	const codePoints = [...unicode];
	let rest = codePoints.slice(1);
	if (rest[0] === VARIATION_SELECTOR_16) {
		rest = rest.slice(1);
	}
	return codePoints[0] + modifier + rest.join('');
}

/**
 * Resolve the emoji string to display for a given skin tone.
 *
 * - tone 0 → the default (toneless) emoji
 * - explicit variants present → use them (non-derivable sequences)
 * - skin-tone capable → derive the variant at runtime
 * - otherwise → the base emoji (not skin-tone capable)
 */
export function emojiForTone(entry: EmojiEntry, tone: number): string {
	if (tone <= 0) return entry.u;
	if (entry.s) return entry.s[tone - 1];
	if (entry.t) return applySkinTone(entry.u, tone);
	return entry.u;
}
