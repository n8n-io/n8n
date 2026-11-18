import type { EntityKind, SizeTier } from '../aquarium.types';

/**
 * A pixel-art sprite as text. Each character is one pixel, and `.` is transparent.
 * The sprite faces right; the renderer mirrors it for the other direction.
 */
export interface PixelSprite {
	/** Maps one character to a CSS colour. */
	palette: Record<string, string>;
	/** Animation frames. All rows of all frames have the same length. */
	frames: string[][];
}

export type MotionStyle =
	/** Swims forward and turns at the walls. */
	| 'swim'
	/** Bobs up and down and moves slowly to the side. */
	| 'drift';

export interface SpeciesDefinition {
	id: string;
	kinds: EntityKind[];
	sizeTiers: SizeTier[];
	sprite: PixelSprite;
	motion: MotionStyle;
	/** Swim animation frames per second at speed 1. */
	frameRate: number;
	/** Rows from the top where the mouth is, for effects such as bubbles. */
	mouthRow?: number;
}

export function defineSpecies(definition: SpeciesDefinition): SpeciesDefinition {
	return definition;
}

export function spriteSize(sprite: PixelSprite): { width: number; height: number } {
	const firstFrame = sprite.frames[0] ?? [];
	return { width: firstFrame[0]?.length ?? 0, height: firstFrame.length };
}

/** Returns a list of problems. An empty list means the sprite is valid. */
export function validateSprite(sprite: PixelSprite): string[] {
	const problems: string[] = [];
	const { width, height } = spriteSize(sprite);
	if (width === 0 || height === 0) problems.push('sprite has no pixels');

	sprite.frames.forEach((frame, frameIndex) => {
		if (frame.length !== height) {
			problems.push(`frame ${frameIndex} has ${frame.length} rows, expected ${height}`);
		}
		frame.forEach((row, rowIndex) => {
			if (row.length !== width) {
				problems.push(
					`frame ${frameIndex} row ${rowIndex} has ${row.length} pixels, expected ${width}`,
				);
			}
			for (const char of row) {
				if (char !== '.' && !(char in sprite.palette)) {
					problems.push(`frame ${frameIndex} row ${rowIndex} uses "${char}", not in palette`);
				}
			}
		});
	});

	return problems;
}
