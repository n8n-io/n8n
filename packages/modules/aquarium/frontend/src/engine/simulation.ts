import { MAX_SWIM_SPEED, SPEED_EASING_SECONDS, WANDER } from '../aquarium.constants';
import type { AquariumEntity, CreatureTraits, EntityActivity } from '../aquarium.types';
import { spriteSize, type SpeciesDefinition } from '../species/species.types';
import { liveSpeedBoostFor, recentRate } from './scaling';

/** Tank size in logical pixels. Creatures stay above `floor`. */
export interface TankBounds {
	width: number;
	height: number;
	floor: number;
}

export interface Creature {
	entity: AquariumEntity;
	traits: CreatureTraits;
	species: SpeciesDefinition;
	x: number;
	y: number;
	width: number;
	height: number;
	facing: 1 | -1;
	targetY: number;
	/**
	 * The depth the creature lives at, 0 (top) to 1 (just above the sand). Homes are spread evenly,
	 * so the creatures do not gather in the middle of the tank.
	 */
	homeDepth: number;
	/** On a quick trip to the top or bottom. It ends at the target, and the creature goes home. */
	excursion: boolean;
	/** Seconds until the creature picks a new depth, and maybe turns. */
	wanderIn: number;
	/** Seconds alive. Drives the animation. */
	age: number;
	/** Current speed in logical pixels per second. It eases toward `targetSpeedOf()`. */
	speed: number;
	/** Live run counts. Undefined when the entity had no recent runs. */
	activity?: EntityActivity;
	/** The tank that holds the creature. Its position is local to that tank. */
	tankId: string;
}

export type RandomFn = () => number;

const MOTION = {
	swim: { horizontal: 1, vertical: 0.3 },
	drift: { horizontal: 0.3, vertical: 0.6 },
} as const;

const TURN_CHANCE = 0.25;
const MIN_VERTICAL_SPEED = 1;

function maxY(creature: Pick<Creature, 'height'>, bounds: TankBounds) {
	return Math.max(0, bounds.floor - creature.height);
}

function maxX(creature: Pick<Creature, 'width'>, bounds: TankBounds) {
	return Math.max(0, bounds.width - creature.width);
}

function sizeOf(traits: CreatureTraits, species: SpeciesDefinition) {
	const { width, height } = spriteSize(species.sprite);
	return { width: width * traits.scale, height: height * traits.scale };
}

export function spawnCreature(
	entity: AquariumEntity,
	traits: CreatureTraits,
	species: SpeciesDefinition,
	bounds: TankBounds,
	random: RandomFn = Math.random,
	tankId = '',
): Creature {
	const size = sizeOf(traits, species);
	const homeDepth = WANDER.homeMin + random() * (WANDER.homeMax - WANDER.homeMin);
	const y = homeDepth * maxY(size, bounds);
	return {
		entity,
		traits,
		species,
		...size,
		x: random() * maxX(size, bounds),
		y,
		facing: random() < 0.5 ? 1 : -1,
		targetY: y,
		homeDepth,
		excursion: false,
		wanderIn: random() * 4,
		age: random() * 10,
		speed: traits.speed * (traits.speedFactor ?? 1),
		tankId,
	};
}

/** Keeps the position, so a refresh does not make the tank jump. */
export function updateCreature(
	creature: Creature,
	entity: AquariumEntity,
	traits: CreatureTraits,
	species: SpeciesDefinition,
	bounds: TankBounds,
): void {
	Object.assign(creature, { entity, traits, species }, sizeOf(traits, species));
	clampToTank(creature, bounds);
}

export function clampToTank(creature: Creature, bounds: TankBounds): void {
	creature.x = Math.min(Math.max(0, creature.x), maxX(creature, bounds));
	creature.y = Math.min(Math.max(0, creature.y), maxY(creature, bounds));
	creature.targetY = Math.min(Math.max(0, creature.targetY), maxY(creature, bounds));
}

/** Resting speed from the traits, plus a boost from the live start rate, times the speed factor. */
export function targetSpeedOf(creature: Creature): number {
	const rate = creature.activity ? recentRate(creature.activity.startedPerSecond) : 0;
	return (creature.traits.speed + liveSpeedBoostFor(rate)) * (creature.traits.speedFactor ?? 1);
}

/**
 * A new target depth: usually near home, sometimes a quick trip to the top or bottom. Targets near
 * home keep the creatures spread over the tank; random targets anywhere pull them to the middle.
 */
function pickDepth(creature: Creature, bounds: TankBounds, random: RandomFn): void {
	const lowest = maxY(creature, bounds);
	if (random() < WANDER.excursionChance) {
		creature.excursion = true;
		const edge = random() * WANDER.edgeShare;
		creature.targetY = (random() < 0.5 ? edge : 1 - edge) * lowest;
		return;
	}
	creature.excursion = false;
	const offset = (random() * 2 - 1) * WANDER.homeSpread;
	creature.targetY = Math.min(1, Math.max(0, creature.homeDepth + offset)) * lowest;
}

/** True when live activity shows any run: started, running, paused or ended in the window. */
function hasLiveRuns(creature: Creature): boolean {
	const activity = creature.activity;
	if (!activity) return false;
	return (
		activity.started > 0 ||
		activity.running > 0 ||
		activity.waiting > 0 ||
		activity.succeeded > 0 ||
		activity.failed > 0
	);
}

/** A creature that has never run stays where it is, until a live run wakes it. */
export function isResting(creature: Creature): boolean {
	return creature.traits.still === true && !hasLiveRuns(creature);
}

/** Moves the creature for `dt` seconds. Mutates it to save allocations in the frame loop. */
export function stepCreature(
	creature: Creature,
	dt: number,
	bounds: TankBounds,
	random: RandomFn = Math.random,
): void {
	if (isResting(creature)) {
		// No speed, drift, turns or animation: the age drives the frames and the effects.
		creature.speed = 0;
		return;
	}

	const motion = MOTION[creature.species.motion];
	const easing = 1 - Math.exp(-dt / SPEED_EASING_SECONDS);
	creature.speed += (targetSpeedOf(creature) - creature.speed) * easing;
	const speed = creature.speed;

	creature.age += dt;
	creature.wanderIn -= dt;
	if (creature.wanderIn <= 0) {
		creature.wanderIn = 2 + random() * 4;
		pickDepth(creature, bounds, random);
		if (random() < TURN_CHANCE) creature.facing = creature.facing === 1 ? -1 : 1;
	}

	creature.x += creature.facing * speed * motion.horizontal * dt;
	if (creature.x <= 0) {
		creature.x = 0;
		creature.facing = 1;
	} else if (creature.x >= maxX(creature, bounds)) {
		creature.x = maxX(creature, bounds);
		creature.facing = -1;
	}

	const verticalSpeed = creature.excursion
		? Math.max(WANDER.excursionMinSpeed, speed * WANDER.excursionSpeedShare)
		: Math.max(MIN_VERTICAL_SPEED, speed * motion.vertical);
	const deltaY = creature.targetY - creature.y;
	creature.y += Math.sign(deltaY) * Math.min(Math.abs(deltaY), verticalSpeed * dt);
	if (creature.excursion && Math.abs(creature.targetY - creature.y) < 0.5) {
		// Arrived: the next pick takes the creature home again.
		creature.excursion = false;
		creature.wanderIn = Math.min(creature.wanderIn, 1 + random() * 2);
	}

	clampToTank(creature, bounds);
}

/** Faster creatures also flap faster. */
export function frameIndexOf(creature: Creature): number {
	const frameCount = creature.species.sprite.frames.length;
	const tempo = 0.5 + (1.5 * creature.speed) / MAX_SWIM_SPEED;
	return Math.floor(creature.age * creature.species.frameRate * tempo) % frameCount;
}

/** Returns the top creature at the point. The last creature is drawn on top. */
export function findCreatureAt(creatures: Creature[], x: number, y: number): Creature | undefined {
	for (let i = creatures.length - 1; i >= 0; i--) {
		const c = creatures[i];
		if (x >= c.x && x < c.x + c.width && y >= c.y && y < c.y + c.height) return c;
	}
	return undefined;
}
