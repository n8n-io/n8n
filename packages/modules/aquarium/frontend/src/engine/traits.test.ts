import type { AquariumEntity } from '../aquarium.types';
import { emptyMetrics } from '../sources/source.utils';
import { failureRateOf } from './scaling';
import { defaultTraitRules, deriveTraits, type TraitRule } from './traits';

function entity(
	overrides: Partial<AquariumEntity['metrics']>,
	kind: 'workflow' | 'agent' = 'workflow',
) {
	return {
		key: `${kind}:1`,
		id: '1',
		kind,
		name: 'Test',
		metrics: { ...emptyMetrics(), ...overrides },
	} satisfies AquariumEntity;
}

describe('deriveTraits', () => {
	it('gives small workflows a small species and big workflows a big one', () => {
		expect(deriveTraits(entity({ complexity: 1 })).speciesId).toBe('minnow');
		expect(deriveTraits(entity({ complexity: 50 })).speciesId).toBe('whale');
	});

	it('gives agents an agent species', () => {
		expect(deriveTraits(entity({ complexity: 1 }, 'agent')).speciesId).toBe('jellyfish');
		expect(deriveTraits(entity({ complexity: 20 }, 'agent')).speciesId).toBe('octopus');
	});

	it('makes busy creatures faster', () => {
		const idle = deriveTraits(entity({ executionCount: 0 }));
		const busy = deriveTraits(entity({ executionCount: 5_000 }));

		expect(busy.speed).toBeGreaterThan(idle.speed);
	});

	it('adds bubbles only to creatures that run often', () => {
		expect(deriveTraits(entity({ executionCount: 0 })).effects).toEqual([]);
		expect(deriveTraits(entity({ executionCount: 100 })).effects).toEqual(['bubbles']);
	});

	it('applies extra rules after the default rules', () => {
		const sickRule: TraitRule = (e, traits) =>
			failureRateOf(e.metrics) > 0.5 ? { ...traits, tint: '#00ff00' } : traits;

		const traits = deriveTraits(entity({ executionCount: 10, failedCount: 9 }), [
			...defaultTraitRules,
			sickRule,
		]);

		expect(traits.tint).toBe('#00ff00');
		expect(traits.speciesId).toBe('minnow');
	});
});
