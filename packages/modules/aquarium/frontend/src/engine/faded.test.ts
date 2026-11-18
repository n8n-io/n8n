import { builtinSpecies } from '../species/builtin';
import { validateSprite } from '../species/species.types';
import { desaturate, toFaded } from './faded';

describe('desaturate', () => {
	it('keeps the colour at 0 and makes a grey at 1', () => {
		expect(desaturate('#ef4137', 0)).toBe('#ef4137');
		const grey = desaturate('#ef4137', 1);
		expect(grey.slice(1, 3)).toBe(grey.slice(3, 5));
		expect(grey.slice(3, 5)).toBe(grey.slice(5, 7));
	});

	it('leaves greys as they are', () => {
		expect(desaturate('#808080', 0.75)).toBe('#808080');
	});
});

describe('toFaded', () => {
	it.each(builtinSpecies.map((species) => [species.id, species] as const))(
		'keeps the %s sprite valid and changes only the palette',
		(_id, species) => {
			const faded = toFaded(species.sprite);
			expect(validateSprite(faded)).toEqual([]);
			expect(faded.frames).toBe(species.sprite.frames);
			expect(Object.keys(faded.palette)).toEqual(Object.keys(species.sprite.palette));
		},
	);
});
