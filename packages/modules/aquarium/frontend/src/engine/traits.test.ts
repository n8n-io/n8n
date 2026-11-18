import {
	SICK_GLITCH_EVERY_SECONDS,
	SICK_SPEED_FACTOR,
	SICK_TINT,
	SKELETON_SPEED_FACTOR,
} from '../aquarium.constants';
import type { AquariumEntity } from '../aquarium.types';
import { emptyMetrics } from '../sources/source.utils';
import { failureRateOf } from './scaling';
import { defaultTraitRules, deriveTraits, EMPTY_TRAIT_CONTEXT, type TraitRule } from './traits';

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
		expect(deriveTraits(entity({ complexity: 1 }, 'agent')).speciesId).toBe('seahorse');
		expect(deriveTraits(entity({ complexity: 20 }, 'agent')).speciesId).toBe('seahorse');
	});

	it('gives agents one seaweed strand for each skill, and workflows none', () => {
		expect(deriveTraits(entity({ complexity: 3 }, 'agent')).effects).toContain('skillStrands');
		expect(deriveTraits(entity({ complexity: 3 })).effects).not.toContain('skillStrands');
	});

	it('makes busy creatures faster', () => {
		const idle = deriveTraits(entity({ executionCount: 0 }));
		const busy = deriveTraits(entity({ executionCount: 5_000 }));

		expect(busy.speed).toBeGreaterThan(idle.speed);
	});

	it('adds bubbles only to creatures that run often', () => {
		expect(deriveTraits(entity({ executionCount: 0 })).effects).not.toContain('bubbles');
		expect(deriveTraits(entity({ executionCount: 100 })).effects).toContain('bubbles');
	});

	it('adds a watching cat only to creatures with a security risk', () => {
		expect(deriveTraits(entity({ securityRisks: 0 })).effects).not.toContain('cat');
		expect(deriveTraits(entity({})).effects).not.toContain('cat');
		expect(deriveTraits(entity({ securityRisks: 2 })).effects).toContain('cat');
	});

	it('makes creatures that fail often glitch green and swim slowly', () => {
		const healthy = deriveTraits(entity({ executionCount: 100, failedCount: 10 }));
		const sick = deriveTraits(entity({ executionCount: 100, failedCount: 45 }));

		expect(healthy).not.toHaveProperty('tint');
		expect(healthy).not.toHaveProperty('speedFactor');
		expect(sick).toMatchObject({
			tint: SICK_TINT,
			glitchEverySeconds: SICK_GLITCH_EVERY_SECONDS,
			speedFactor: SICK_SPEED_FACTOR,
		});
	});

	it('turns a creature whose every run failed into a skeleton, over the sick look', () => {
		const skeleton = deriveTraits(entity({ executionCount: 20, failedCount: 20 }));

		expect(skeleton).toMatchObject({ skeleton: true, speedFactor: SKELETON_SPEED_FACTOR });
		expect(skeleton.tint).toBeUndefined();
		expect(skeleton.glitchEverySeconds).toBeUndefined();
	});

	it('waits for enough runs before it shows a skeleton, and lets it recover', () => {
		expect(deriveTraits(entity({ executionCount: 5, failedCount: 5 })).skeleton).toBeUndefined();
		expect(deriveTraits(entity({ executionCount: 20, failedCount: 19 })).skeleton).toBeUndefined();
	});

	it('lets workflows shimmer while they run, but not sick ones, skeletons or agents', () => {
		const shimmers = (overrides: Partial<AquariumEntity['metrics']>, kind?: 'agent') =>
			deriveTraits(entity(overrides, kind)).shimmer === true;

		expect(shimmers({ executionCount: 100 })).toBe(true);
		expect(shimmers({ executionCount: 100, failedCount: 45 })).toBe(false);
		expect(shimmers({ executionCount: 20, failedCount: 20 })).toBe(false);
		expect(shimmers({ executionCount: 100 }, 'agent')).toBe(false);
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

	it('makes an old workflow a turtle, and a big old workflow a bigger turtle', () => {
		const small = entity({ complexity: 1 });
		const big = { ...entity({ complexity: 50 }), key: 'workflow:big' };
		const context = { ...EMPTY_TRAIT_CONTEXT, oldWorkflowKeys: new Set([small.key, big.key]) };

		expect(deriveTraits(small, defaultTraitRules, context)).toMatchObject({
			speciesId: 'turtle',
			scale: 1,
		});
		expect(deriveTraits(big, defaultTraitRules, context)).toMatchObject({
			speciesId: 'turtle',
			scale: 2,
		});
		expect(deriveTraits(small).speciesId).toBe('minnow');
	});

	it('makes a busy simple workflow a penguin, even when it is old', () => {
		const simple = entity({ complexity: 2, executionCount: 5_000 });
		const complex = { ...entity({ complexity: 20, executionCount: 5_000 }), key: 'workflow:big' };
		const keys = new Set([simple.key, complex.key]);
		const context = { busyWorkflowKeys: keys, oldWorkflowKeys: keys };

		expect(deriveTraits(simple, defaultTraitRules, context)).toMatchObject({
			speciesId: 'penguin',
			scale: 1,
		});
		expect(deriveTraits(complex, defaultTraitRules, context).speciesId).toBe('turtle');
		expect(deriveTraits(simple).speciesId).toBe('minnow');
	});

	it('makes a workflow that never ran still, but not an agent or a workflow with runs', () => {
		expect(deriveTraits(entity({ executionCount: 0 })).still).toBe(true);
		expect(deriveTraits(entity({ executionCount: 0 }, 'agent')).still).toBeUndefined();
		expect(deriveTraits(entity({ executionCount: 3 })).still).toBeUndefined();
		// Paused runs are runs.
		expect(deriveTraits(entity({ executionCount: 0, waitingCount: 1 })).still).toBeUndefined();
	});
});
