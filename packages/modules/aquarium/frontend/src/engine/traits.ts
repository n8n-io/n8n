import {
	BUBBLES_MIN_EXECUTIONS,
	SICK_BLINK_SECONDS,
	SICK_FAILURE_RATE,
	SICK_SPEED_FACTOR,
	SICK_TINT,
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

/** A creature that fails often blinks green and swims slowly. */
export const sickRule: TraitRule = (entity, traits) =>
	failureRateOf(entity.metrics) > SICK_FAILURE_RATE
		? {
				...traits,
				tint: SICK_TINT,
				tintBlinkSeconds: SICK_BLINK_SECONDS,
				speedFactor: SICK_SPEED_FACTOR,
			}
		: traits;

/** Order matters: `speciesRule` reads the tier from `sizeRule`. */
export const defaultTraitRules: TraitRule[] = [
	sizeRule,
	speciesRule,
	speedRule,
	bubblesRule,
	securityRule,
	skillStrandsRule,
	sickRule,
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
