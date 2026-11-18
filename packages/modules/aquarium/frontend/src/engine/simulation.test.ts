import type { AquariumEntity } from '../aquarium.types';
import { minnow } from '../species/creatures/minnow';
import { whale } from '../species/creatures/whale';
import { emptyMetrics } from '../sources/source.utils';
import {
	findCreatureAt,
	frameIndexOf,
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

		it('eases toward a new target instead of jumping', () => {
			const creature = spawnCreature(entity, deriveTraits(entity), minnow, bounds, seededRandom());
			creature.activity = activityAt(15);
			const target = targetSpeedOf(creature);

			stepCreature(creature, 0.1, bounds, seededRandom());

			expect(creature.speed).toBeGreaterThan(deriveTraits(entity).speed);
			expect(creature.speed).toBeLessThan(target);
		});
	});
});
