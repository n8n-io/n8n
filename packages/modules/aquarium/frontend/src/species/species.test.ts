import type { EntityKind } from '../aquarium.types';
import { SIZE_TIERS } from '../engine/scaling';
import { builtinSpecies } from './builtin';
import { nessie } from './creatures/nessie';
import { whale } from './creatures/whale';
import { pickSpecies } from './species.registry';
import { defineSpecies, spriteSize, validateSprite } from './species.types';

describe('built-in species', () => {
	it.each(builtinSpecies.map((species) => [species.id, species]))(
		'%s has a valid sprite',
		(_id, species) => {
			expect(validateSprite(species.sprite)).toEqual([]);
		},
	);

	it('has unique ids', () => {
		const ids = builtinSpecies.map((species) => species.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each(['turtle', 'penguin', 'nessie'])(
		'never picks the %s on its own: only a trait rule sets it',
		(id) => {
			for (const kind of ['workflow', 'agent'] as const) {
				for (const tier of SIZE_TIERS) {
					for (const seed of ['a', 'b', 'c', 'd']) {
						expect(pickSpecies(kind, tier, seed)?.id).not.toBe(id);
					}
				}
			}
		},
	);

	it('draws Nessie at least twice as large as the whale', () => {
		const big = spriteSize(nessie.sprite);
		const small = spriteSize(whale.sprite);
		expect(big.width).toBeGreaterThanOrEqual(small.width * 2);
		expect(big.height).toBeGreaterThanOrEqual(small.height * 2);
	});

	it.each<EntityKind>(['workflow', 'agent'])('has a species for every %s size tier', (kind) => {
		for (const tier of SIZE_TIERS) {
			expect(pickSpecies(kind, tier, 'seed')).toBeDefined();
		}
	});
});

describe('validateSprite', () => {
	it('reports rows of the wrong length and unknown colours', () => {
		const problems = validateSprite({
			palette: { a: '#000' },
			frames: [
				['aa', 'a'],
				['ab', 'aa'],
			],
		});

		expect(problems).toEqual([
			'frame 0 row 1 has 1 pixels, expected 2',
			'frame 1 row 0 uses "b", not in palette',
		]);
	});
});

describe('pickSpecies', () => {
	const sprite = { palette: { a: '#000' }, frames: [['a']] };
	const small = defineSpecies({
		id: 'small',
		kinds: ['workflow'],
		sizeTiers: ['tiny'],
		sprite,
		motion: 'swim',
		frameRate: 1,
	});
	const big = defineSpecies({
		id: 'big',
		kinds: ['workflow'],
		sizeTiers: ['huge'],
		sprite,
		motion: 'swim',
		frameRate: 1,
	});

	it('uses the nearest tier when no species has the exact tier', () => {
		expect(pickSpecies('workflow', 'small', 'x', [small, big])?.id).toBe('small');
		expect(pickSpecies('workflow', 'large', 'x', [small, big])?.id).toBe('big');
	});

	it('returns undefined when no species has the kind', () => {
		expect(pickSpecies('agent', 'tiny', 'x', [small, big])).toBeUndefined();
	});

	it('always picks the same species for the same seed', () => {
		const twin = { ...small, id: 'twin' };
		const first = pickSpecies('workflow', 'tiny', 'abc', [small, twin]);
		expect(pickSpecies('workflow', 'tiny', 'abc', [small, twin])).toBe(first);
	});
});
