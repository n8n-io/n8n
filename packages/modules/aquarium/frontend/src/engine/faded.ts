import { STILL_DESATURATION } from '../aquarium.constants';
import type { PixelSprite } from '../species/species.types';

const hex = (value: number) =>
	Math.round(Math.min(255, Math.max(0, value)))
		.toString(16)
		.padStart(2, '0');

/** Moves a `#rrggbb` colour towards its own grey by `amount`, from 0 to 1. */
export function desaturate(colour: string, amount: number): string {
	const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16));
	const grey = 0.299 * r + 0.587 * g + 0.114 * b;
	const mix = (channel: number) => channel + (grey - channel) * amount;
	return `#${hex(mix(r))}${hex(mix(g))}${hex(mix(b))}`;
}

/** The same sprite with washed-out colours, for a creature that does not move. */
export function toFaded(sprite: PixelSprite, amount: number = STILL_DESATURATION): PixelSprite {
	const palette: Record<string, string> = {};
	for (const [key, colour] of Object.entries(sprite.palette)) {
		palette[key] = desaturate(colour, amount);
	}
	return { palette, frames: sprite.frames };
}
