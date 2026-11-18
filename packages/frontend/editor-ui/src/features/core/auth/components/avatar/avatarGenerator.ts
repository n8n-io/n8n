import type { UserAvatarVariant } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

/**
 * Turns a spot on the color field and a seed into the five-color palette of a
 * generated avatar. Everything is deterministic: the same spot and seed always
 * give the same palette, so what the user sees in the preview is exactly what
 * everyone else sees afterwards.
 *
 * The field has two axes. Left to right walks around the color wheel; top to
 * bottom goes from light and pale to deep and dark. The seed decides the
 * arrangement: how far the companion hues wander, which side they lean to,
 * and the order the shapes pick the colors up in. Shuffling only changes the
 * seed, so the user's colors stay put while the composition changes.
 */

export interface AvatarGeneratorInput {
	/** Degrees on the color wheel, 0–360. */
	hue: number;
	/** 0 is deep and dark, 100 is light and pale. */
	tone: number;
	/** Anything; shuffling picks a new one. */
	seed: string;
}

export const PALETTE_SIZE = 5;

/** Brand pink (#FF91AC), as the field opens for someone who never generated a picture. */
export const DEFAULT_GENERATOR_INPUT: Omit<AvatarGeneratorInput, 'seed'> = {
	hue: 347,
	tone: 88,
};

/**
 * Quick picks under the field, in the spirit of a browser theme picker. The
 * first is the brand pink; the rest walk the wheel at its tone, so the row
 * reads as one set, and end on an inky one for people who want something quiet.
 * At a lower tone the greens and blues come out neon next to the pastels.
 */
export interface AvatarColorPreset {
	id: string;
	hue: number;
	tone: number;
}

export const AVATAR_COLOR_PRESETS: readonly AvatarColorPreset[] = [
	{ id: 'pink', hue: 347, tone: 88 },
	{ id: 'peach', hue: 20, tone: 88 },
	{ id: 'sun', hue: 46, tone: 88 },
	{ id: 'moss', hue: 118, tone: 88 },
	{ id: 'sea', hue: 176, tone: 88 },
	{ id: 'sky', hue: 212, tone: 88 },
	{ id: 'grape', hue: 272, tone: 88 },
	{ id: 'ink', hue: 236, tone: 12 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrapHue = (hue: number) => ((hue % 360) + 360) % 360;

/** Small, fast 32-bit hash; good enough to spread seeds across the wheel. */
function hashString(input: string): number {
	let hash = 2166136261;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/** Deterministic 0–1 numbers from a seed, one per call. */
function createRandom(seed: string) {
	let state = hashString(seed) || 1;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return ((state >>> 0) % 100000) / 100000;
	};
}

function toHex(channel: number) {
	return Math.round(clamp(channel, 0, 255))
		.toString(16)
		.padStart(2, '0');
}

export function hslToHex(hue: number, saturation: number, lightness: number): string {
	const s = clamp(saturation, 0, 100) / 100;
	const l = clamp(lightness, 0, 100) / 100;
	const k = (n: number) => (n + wrapHue(hue) / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return `#${toHex(f(0) * 255)}${toHex(f(8) * 255)}${toHex(f(4) * 255)}`;
}

/**
 * The lightness and saturation a tone stands for. Pastels at the top keep
 * their saturation (their softness comes from being light, like the brand
 * pink); only towards the deep end do colors mute into inks. So the field
 * covers pastel to ink without a third control.
 */
export function toneToLightness(tone: number): number {
	return 24 + (clamp(tone, 0, 100) / 100) * 58;
}

export function toneToSaturation(tone: number): number {
	const depth = Math.max(0, 50 - clamp(tone, 0, 100)) / 50;
	return 86 - 34 * depth;
}

/** The single color a spot on the field stands for; what the handle and the preset chips show. */
export function swatchFor(hue: number, tone: number): string {
	return hslToHex(wrapHue(hue), toneToSaturation(tone), toneToLightness(tone));
}

/** Builds the palette. See the module comment for what the inputs mean. */
export function generatePalette(input: AvatarGeneratorInput): string[] {
	const random = createRandom(input.seed);
	const hue = wrapHue(input.hue);
	const lightness = toneToLightness(input.tone);
	const saturation = toneToSaturation(input.tone);

	// Companions sit near the base hue, all leaning the same way so the palette reads
	// as one family, with the farthest one adding a little tension.
	const direction = random() < 0.5 ? 1 : -1;
	const spread = 16 + random() * 26;
	const swing = 9 + random() * 6;

	const chromatic: Array<[number, number, number]> = [
		[hue, saturation, lightness],
		[hue + direction * spread, saturation - 4 + random() * 8, lightness + swing],
		[hue - direction * spread * 0.55, saturation + 2, lightness - swing],
		[hue + direction * spread * 1.9, saturation - 10, lightness + (random() - 0.5) * swing * 2],
	];

	// One near-neutral, tinted with the base hue, gives every palette a brand-like
	// restraint and a guaranteed contrast against the rest.
	const neutral: [number, number, number] =
		lightness > 54 ? [hue, 10, 24 + random() * 8] : [hue, 12, 86 + random() * 6];

	const colors = [...chromatic, neutral];

	// Fisher–Yates with the seeded generator, so a shuffle rearranges which shape
	// gets which color.
	for (let i = colors.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[colors[i], colors[j]] = [colors[j], colors[i]];
	}

	return colors.map(([h, s, l]) => hslToHex(wrapHue(h), s, l));
}

/** Short, URL-safe and unguessable enough for a design seed. */
export function randomSeed(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = new Uint8Array(10);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

/**
 * Generated pictures are always the abstract orb. The user shapes it through
 * the colors and the seed, not by choosing a different drawing.
 */
export const GENERATED_AVATAR_VARIANT: UserAvatarVariant = 'marble';

export const AVATAR_PRESET_LABEL_KEYS: Record<string, BaseTextKey> = {
	pink: 'auth.avatar.generate.preset.pink',
	peach: 'auth.avatar.generate.preset.peach',
	sun: 'auth.avatar.generate.preset.sun',
	moss: 'auth.avatar.generate.preset.moss',
	sea: 'auth.avatar.generate.preset.sea',
	sky: 'auth.avatar.generate.preset.sky',
	grape: 'auth.avatar.generate.preset.grape',
	ink: 'auth.avatar.generate.preset.ink',
};
