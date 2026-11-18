import type { AquariumEntity } from '../aquarium.types';
import { minnow } from '../species/creatures/minnow';
import { whale } from '../species/creatures/whale';
import { emptyMetrics } from '../sources/source.utils';
import {
	findCreatureAt,
	frameIndexOf,
	isAsleep,
	isResting,
	spawnCreature,
	stepCreature,
	targetSpeedOf,
	updateCreature,
	type TankBounds,
} from './simulation';
import { deriveTraits } from './traits';

const bounds: TankBounds = { width: 100, height: 60, floor: 50 };

const entity: AquariumEntity = {
	key: 'workflow:1',
	id: '1',
	kind: 'workflow',
	name: 'Test',
	metrics: { ...emptyMetrics(), executionCount: 1_000 },
};

function seededRandom(seed = 1) {
	let state = seed;
	return () => {
		state = (state * 16807) % 2147483647;
		return state / 2147483647;
	};
}

describe('simulation', () => {
	it('keeps creatures inside the tank and above the floor', () => {
		const random = seededRandom();
		const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, random);

		for (let i = 0; i < 2_000; i++) {
			stepCreature(creature, 0.05, bounds, random);
			expect(creature.x).toBeGreaterThanOrEqual(0);
			expect(creature.x + creature.width).toBeLessThanOrEqual(bounds.width);
			expect(creature.y).toBeGreaterThanOrEqual(0);
			expect(creature.y + creature.height).toBeLessThanOrEqual(bounds.floor);
		}
	});

	it('turns around at a wall', () => {
		const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, seededRandom());
		creature.x = bounds.width - creature.width - 0.1;
		creature.facing = 1;
		creature.wanderIn = 100;

		stepCreature(creature, 1, bounds);

		expect(creature.facing).toBe(-1);
	});

	it('keeps the position when the creature changes species', () => {
		const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, seededRandom());
		creature.x = 10;
		creature.y = 5;

		updateCreature(creature, entity, deriveTraits(entity), whale, bounds);

		expect(creature.species.id).toBe('whale');
		expect(creature.x).toBe(10);
		expect(creature.y).toBe(5);
	});

	it('animates through all frames', () => {
		const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, seededRandom());
		const frames = new Set<number>();
		for (let i = 0; i < 50; i++) {
			creature.age = i * 0.1;
			frames.add(frameIndexOf(creature));
		}

		expect(frames.size).toBe(minnow.sprite.frames.length);
	});

	it('finds the top creature at a point', () => {
		const random = seededRandom();
		const below = spawnCreature(entity, deriveTraits(entity), whale, bounds, random);
		const above = spawnCreature(
			{ ...entity, key: 'workflow:2' },
			deriveTraits(entity),
			minnow,
			bounds,
			random,
		);
		Object.assign(below, { x: 0, y: 0 });
		Object.assign(above, { x: 2, y: 2 });

		expect(findCreatureAt([below, above], 3, 3)?.entity.key).toBe('workflow:2');
		expect(findCreatureAt([below, above], 25, 10)?.entity.key).toBe('workflow:1');
		expect(findCreatureAt([below, above], 99, 49)).toBeUndefined();
	});

	describe('speed', () => {
		const activityAt = (perSecond: number) => ({
			running: 1,
			started: perSecond * 60,
			succeeded: perSecond * 60,
			failed: 0,
			waiting: 0,
			paused: 0,
			startedPerSecond: new Array(60).fill(perSecond),
			lastEventAt: 0,
		});

		function settle(perSecond: number | undefined) {
			const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, seededRandom());
			creature.activity = perSecond === undefined ? undefined : activityAt(perSecond);
			for (let i = 0; i < 200; i++) stepCreature(creature, 0.05, bounds, seededRandom());
			return creature.speed;
		}

		it('rests at the trait speed without live activity', () => {
			expect(settle(undefined)).toBeCloseTo(deriveTraits(entity).speed, 1);
		});

		it('swims faster at 15 runs per second than at 5', () => {
			expect(settle(15)).toBeGreaterThan(settle(5) + 5);
		});

		it('applies the speed factor to the live boost too', () => {
			const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, seededRandom());
			creature.activity = activityAt(15);
			const full = targetSpeedOf(creature);

			creature.traits = { ...creature.traits, speedFactor: 0.4 };

			expect(targetSpeedOf(creature)).toBeCloseTo(full * 0.4);
		});

		it('spawns a slowed creature at its slowed speed', () => {
			const traits = { ...deriveTraits(entity), speedFactor: 0.4 };
			const creature = spawnCreature(entity, traits, minnow, bounds, seededRandom());

			expect(creature.speed).toBeCloseTo(traits.speed * 0.4);
		});

		it('eases toward a new target instead of jumping', () => {
			const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, seededRandom());
			creature.activity = activityAt(15);
			const target = targetSpeedOf(creature);

			stepCreature(creature, 0.1, bounds, seededRandom());

			expect(creature.speed).toBeGreaterThan(deriveTraits(entity).speed);
			expect(creature.speed).toBeLessThan(target);
		});
	});

	describe('still creatures', () => {
		const neverRan: AquariumEntity = { ...entity, metrics: { ...emptyMetrics() } };

		it('does not move, turn or animate a workflow that never ran', () => {
			const random = seededRandom();
			const creature = spawnCreature(neverRan, deriveTraits(neverRan), minnow, bounds, random);
			const before = { x: creature.x, y: creature.y, facing: creature.facing, age: creature.age };

			for (let i = 0; i < 500; i++) stepCreature(creature, 0.05, bounds, random);

			expect(isResting(creature)).toBe(true);
			expect({ x: creature.x, y: creature.y, facing: creature.facing, age: creature.age }).toEqual(
				before,
			);
			expect(creature.speed).toBe(0);
		});

		it('wakes up when live activity shows a run', () => {
			const random = seededRandom();
			const creature = spawnCreature(neverRan, deriveTraits(neverRan), minnow, bounds, random);
			creature.x = 20;
			creature.facing = 1;
			creature.activity = {
				running: 1,
				started: 1,
				succeeded: 0,
				failed: 0,
				waiting: 0,
				paused: 0,
				startedPerSecond: [1],
				lastEventAt: 0,
			};

			for (let i = 0; i < 20; i++) stepCreature(creature, 0.05, bounds, random);

			expect(isResting(creature)).toBe(false);
			expect(creature.x).not.toBe(20);
		});
	});

	describe('depth', () => {
		const tank: TankBounds = { width: 300, height: 160, floor: 150 };
		const fish = (i: number): AquariumEntity => ({
			...entity,
			key: `workflow:${i}`,
			metrics: { ...emptyMetrics(), executionCount: 10 ** (i % 4) },
		});

		it('spreads creatures over the height: about 12% at each edge, 25% in each middle band', () => {
			const random = seededRandom(7);
			const creatures = Array.from({ length: 120 }, (_, i) =>
				spawnCreature(fish(i), deriveTraits(fish(i)), minnow, tank, random),
			);
			const bands = [0, 0, 0, 0, 0];

			// Three minutes, sampled after the first minute.
			for (let step = 0; step < 1800; step++) {
				for (const creature of creatures) stepCreature(creature, 0.1, tank, random);
				if (step < 600 || step % 10 !== 0) continue;
				for (const creature of creatures) {
					const depth = creature.y / (tank.floor - creature.height);
					bands[Math.min(4, Math.floor(depth * 5))]++;
				}
			}

			const total = bands.reduce((sum, count) => sum + count, 0);
			const shares = bands.map((count) => count / total);
			for (const edge of [shares[0], shares[4]]) {
				expect(edge).toBeGreaterThan(0.06);
				expect(edge).toBeLessThan(0.18);
			}
			for (const middle of shares.slice(1, 4)) {
				expect(middle).toBeGreaterThan(0.17);
				expect(middle).toBeLessThan(0.34);
			}
		});

		it('sometimes makes a quick trip to the top or bottom, then goes home', () => {
			const random = seededRandom(11);
			const creature = spawnCreature(fish(1), deriveTraits(fish(1)), minnow, tank, random);
			creature.homeDepth = 0.5;
			let reachedEdge = false;

			for (let step = 0; step < 6000 && !reachedEdge; step++) {
				stepCreature(creature, 0.1, tank, random);
				const depth = creature.y / (tank.floor - creature.height);
				if (creature.excursion && (depth < 0.2 || depth > 0.8)) reachedEdge = true;
			}

			expect(reachedEdge).toBe(true);
		});
	});

	describe('sleep and belly-up', () => {
		const settle = (metrics: Partial<AquariumEntity['metrics']>) => {
			const sleeper = { ...entity, metrics: { ...entity.metrics, ...metrics } };
			const creature = spawnCreature(
				sleeper,
				deriveTraits(sleeper),
				minnow,
				bounds,
				seededRandom(),
			);
			for (let i = 0; i < 400; i++) stepCreature(creature, 0.05, bounds, seededRandom());
			return creature;
		};

		it('lets a workflow with a paused run sleep on the sand', () => {
			const creature = settle({ waitingCount: 1 });

			expect(isAsleep(creature)).toBe(true);
			expect(targetSpeedOf(creature)).toBe(0);
			expect(Math.round(creature.y + creature.height)).toBe(bounds.floor);
		});

		it('floats a workflow whose runs mostly fail to the surface, awake', () => {
			const creature = settle({ executionCount: 20, failedCount: 15, waitingCount: 1 });

			expect(isAsleep(creature)).toBe(false);
			expect(Math.round(creature.y)).toBe(0);
		});
	});
});
