import {
	BUBBLES_MIN_EXECUTIONS,
	BUSY_WORKFLOW,
	SICK_FAILURE_RATE,
	SICK_GLITCH_EVERY_SECONDS,
	SICK_SPEED_FACTOR,
	SICK_TINT,
	SKELETON_SPEED_FACTOR,
	BELLY_UP_SPEED_FACTOR,
	TANK_HEALTH,
} from '../aquarium.constants';
import type { AquariumEntity, CreatureTraits } from '../aquarium.types';
import { penguin } from '../species/creatures/penguin';
import { turtle } from '../species/creatures/turtle';
import { pickSpecies } from '../species/species.registry';
import { complexityScore, failureRateOf, sizeTierFor, swimSpeedFor } from './scaling';

/**
 * One step of the trait pipeline. A rule gets the traits of the previous rules and
 * returns new traits. Add a rule to change how a metric shows in the tank.
 */
export type TraitRule = (
	entity: AquariumEntity,
	traits: CreatureTraits,
	context: TraitContext,
) => CreatureTraits;

/**
 * Facts about all entities, worked out once for each update. A rule that compares an entity with
 * the others reads them here, because a rule sees one entity at a time.
 */
export interface TraitContext {
	/** Keys of workflows that are old compared with the rest. See `oldWorkflowKeys()`. */
	oldWorkflowKeys: ReadonlySet<string>;
	/** Keys of workflows that run more than the rest. See `busyWorkflowKeys()`. */
	busyWorkflowKeys: ReadonlySet<string>;
}

export const EMPTY_TRAIT_CONTEXT: TraitContext = {
	oldWorkflowKeys: new Set(),
	busyWorkflowKeys: new Set(),
};

export const sizeRule: TraitRule = (entity, traits) => {
	const sizeTier = sizeTierFor(complexityScore(entity.metrics));
	return { ...traits, sizeTier };
};

export const speciesRule: TraitRule = (entity, traits) => {
	const species = pickSpecies(entity.kind, traits.sizeTier, entity.id);
	return species ? { ...traits, speciesId: species.id } : traits;
};

/** Old workflows are turtles. A large or huge one is a bigger turtle, so size still shows. */
export const turtleRule: TraitRule = (entity, traits, context) =>
	context.oldWorkflowKeys.has(entity.key)
		? {
				...traits,
				speciesId: turtle.id,
				scale: traits.sizeTier === 'large' || traits.sizeTier === 'huge' ? 2 : 1,
			}
		: traits;

const isBusyTier = (tier: CreatureTraits['sizeTier']) =>
	BUSY_WORKFLOW.sizeTiers.some((busyTier) => busyTier === tier);

/** Simple workflows that run a lot are penguins. It overrides the turtle: busy says more than old. */
export const penguinRule: TraitRule = (entity, traits, context) =>
	context.busyWorkflowKeys.has(entity.key) && isBusyTier(traits.sizeTier)
		? { ...traits, speciesId: penguin.id, scale: 1 }
		: traits;

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

/** Most runs fail: the creature floats belly-up at the surface. It overrides the sick look. */
export const bellyUpRule: TraitRule = (entity, traits) =>
	entity.metrics.executionCount >= TANK_HEALTH.minRuns &&
	failureRateOf(entity.metrics) > TANK_HEALTH.critical
		? {
				...traits,
				bellyUp: true,
				tint: undefined,
				glitchEverySeconds: undefined,
				speedFactor: BELLY_UP_SPEED_FACTOR,
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
				bellyUp: undefined,
				tint: undefined,
				glitchEverySeconds: undefined,
				speedFactor: SKELETON_SPEED_FACTOR,
			}
		: traits;

/** A workflow shimmers gold while it runs. Sick, belly-up and skeleton creatures do not. */
export const shimmerRule: TraitRule = (entity, traits) =>
	entity.kind === 'workflow' &&
	!traits.skeleton &&
	!traits.bellyUp &&
	traits.glitchEverySeconds === undefined
		? { ...traits, shimmer: true }
		: traits;

/** A workflow falls asleep while one of its runs waits. The effect checks the live counts. */
export const sleepRule: TraitRule = (entity, traits) =>
	entity.kind === 'workflow' ? { ...traits, effects: [...traits.effects, 'zzz'] } : traits;

/** A workflow with an error workflow never swims alone: a remora follows it. */
export const remoraRule: TraitRule = (entity, traits) =>
	entity.design?.hasErrorWorkflow ? { ...traits, effects: [...traits.effects, 'remora'] } : traits;

/** A workflow with no runs at all stands still. Agents have no run data yet, so they move. */
export const stillRule: TraitRule = (entity, traits) =>
	entity.kind === 'workflow' &&
	entity.metrics.executionCount === 0 &&
	entity.metrics.waitingCount === 0
		? { ...traits, still: true }
		: traits;

/**
 * Order matters: `speciesRule` reads the tier from `sizeRule`, `turtleRule` and then
 * `penguinRule` override the species, `bellyUpRule` overrides `sickRule`, `skeletonRule`
 * overrides both, and `shimmerRule` reads all three.
 */
export const defaultTraitRules: TraitRule[] = [
	sizeRule,
	speciesRule,
	turtleRule,
	penguinRule,
	speedRule,
	bubblesRule,
	securityRule,
	skillStrandsRule,
	sickRule,
	bellyUpRule,
	skeletonRule,
	shimmerRule,
	sleepRule,
	remoraRule,
	stillRule,
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
	context: TraitContext = EMPTY_TRAIT_CONTEXT,
): CreatureTraits {
	return rules.reduce((traits, rule) => rule(entity, traits, context), BASE_TRAITS);
}
