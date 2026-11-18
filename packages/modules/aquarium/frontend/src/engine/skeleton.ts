import type { PixelSprite } from '../species/species.types';

/** Bone colours of the state spec, from the outline to the brightest bone. */
const BONE = ['#17252d', '#657f88', '#b8c8bf', '#f4e8cf'] as const;
/** A palette key that no species uses. */
const RIB = '+';

function brightness(hex: string): number {
	const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * The same sprite in bone colours, so the species stays recognisable: each colour takes the bone
 * shade of its brightness. Every third column across the middle of the body becomes a rib.
 */
export function toSkeleton(sprite: PixelSprite): PixelSprite {
	const palette: Record<string, string> = { [RIB]: BONE[1] };
	for (const [key, colour] of Object.entries(sprite.palette)) {
		const shade = Math.min(BONE.length - 1, Math.floor(brightness(colour) ** 0.8 * BONE.length));
		palette[key] = BONE[shade] ?? BONE[0];
	}

	const frames = sprite.frames.map((rows) =>
		rows.map((row, y) =>
			[...row]
				.map((char, x) => {
					const body =
						x > row.length * 0.35 &&
						x < row.length * 0.75 &&
						y > rows.length * 0.25 &&
						y < rows.length * 0.75;
					const outline = palette[char] === BONE[0];
					return char !== '.' && !outline && body && x % 3 === 0 ? RIB : char;
				})
				.join(''),
		),
	);
	return { palette, frames };
}
