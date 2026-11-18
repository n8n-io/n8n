import {
	BUBBLES_MIN_EXECUTIONS,
	SICK_FAILURE_RATE,
	SICK_GLITCH_EVERY_SECONDS,
	SICK_SPEED_FACTOR,
	SICK_TINT,
	SKELETON_SPEED_FACTOR,
	TANK_HEALTH,
} from '../aquarium.constants';
import type { AquariumEntity, CreatureTraits } from '../aquarium.types';
import { pickSpecies } from '../species/species.registry';
import { complexityScore, failureRateOf, sizeTierFor, swimSpeedFor } from './scaling';

/**
 * One step of the trait pipeline. A rule gets the traits of the previous rules and
 * returns new traits. Add a rule to change how a metric shows in the tank.
 */
export type TraitRule = (entity: AquariumEntity, traits: CreatureTraits) => CreatureTraits;

export const sizeRule: TraitRule = (entity, traits) => {
	const sizeTier = sizeTierFor(complexityScore(entity.metrics));
	return { ...traits, sizeTier };
};

export const speciesRule: TraitRule = (entity, traits) => {
	const species = pickSpecies(entity.kind, traits.sizeTier, entity.id);
	return species ? { ...traits, speciesId: species.id } : traits;
};

export const speedRule: TraitRule = (entity, traits) => ({
	...traits,
	speed: swimSpeedFor(entity.metrics.executionCount),
});

export const bubblesRule: TraitRule = (entity, traits) =>
	entity.metrics.executionCount >= BUBBLES_MIN_EXECUTIONS
		? { ...traits, effects: [...traits.effects, 'bubbles'] }
		: traits;

/** A cat watches a creature that fails a security check. */
export const securityRule: TraitRule = (entity, traits) =>
	(entity.metrics.securityRisks ?? 0) > 0
		? { ...traits, effects: [...traits.effects, 'cat'] }
		: traits;

/** An agent holds one seaweed strand for each skill. */
export const skillStrandsRule: TraitRule = (entity, traits) =>
	entity.kind === 'agent' ? { ...traits, effects: [...traits.effects, 'skillStrands'] } : traits;

/** A creature that fails often glitches green now and then, and swims slowly. */
export const sickRule: TraitRule = (entity, traits) =>
	failureRateOf(entity.metrics) > SICK_FAILURE_RATE
		? {
				...traits,
				tint: SICK_TINT,
				glitchEverySeconds: SICK_GLITCH_EVERY_SECONDS,
				speedFactor: SICK_SPEED_FACTOR,
			}
		: traits;

/**
 * Every run failed: the creature becomes a skeleton and barely moves. It overrides the sick look.
 * It recovers as soon as one run succeeds.
 */
export const skeletonRule: TraitRule = (entity, traits) =>
	entity.metrics.executionCount >= TANK_HEALTH.minRuns && failureRateOf(entity.metrics) === 1
		? {
				...traits,
				skeleton: true,
				tint: undefined,
				glitchEverySeconds: undefined,
				speedFactor: SKELETON_SPEED_FACTOR,
			}
		: traits;

/** A workflow shimmers gold while it runs. Sick creatures and skeletons do not shimmer. */
export const shimmerRule: TraitRule = (entity, traits) =>
	entity.kind === 'workflow' && !traits.skeleton && traits.glitchEverySeconds === undefined
		? { ...traits, shimmer: true }
		: traits;

/**
 * Order matters: `speciesRule` reads the tier from `sizeRule`, `skeletonRule` overrides
 * `sickRule`, and `shimmerRule` reads both.
 */
export const defaultTraitRules: TraitRule[] = [
	sizeRule,
	speciesRule,
	speedRule,
	bubblesRule,
	securityRule,
	skillStrandsRule,
	sickRule,
	skeletonRule,
	shimmerRule,
];

const BASE_TRAITS: CreatureTraits = {
	speciesId: '',
	sizeTier: 'tiny',
	scale: 1,
	speed: 0,
	effects: [],
};

export function deriveTraits(
	entity: AquariumEntity,
	rules: TraitRule[] = defaultTraitRules,
): CreatureTraits {
	return rules.reduce((traits, rule) => rule(entity, traits), BASE_TRAITS);
}
