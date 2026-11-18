import { builtinSpecies } from '../species/builtin';
import { spriteSize, validateSprite } from '../species/species.types';
import { toSkeleton } from './skeleton';

const BONE = new Set(['#17252d', '#657f88', '#b8c8bf', '#f4e8cf']);

describe('toSkeleton', () => {
	it.each(builtinSpecies.map((species) => [species.id, species] as const))(
		'keeps the shape of the %s, in bone colours only',
		(_, species) => {
			const skeleton = toSkeleton(species.sprite);

			expect(validateSprite(skeleton)).toEqual([]);
			expect(spriteSize(skeleton)).toEqual(spriteSize(species.sprite));
			expect(Object.values(skeleton.palette).every((colour) => BONE.has(colour))).toBe(true);
			// Same transparent pixels, so the silhouette does not change.
			const holes = (rows: string[]) => rows.map((row) => row.replace(/[^.]/g, '#'));
			expect(skeleton.frames.map(holes)).toEqual(species.sprite.frames.map(holes));
		},
	);
});
