import { WAKE } from '../aquarium.constants';
import type { AquariumEntity } from '../aquarium.types';
import { emptyMetrics } from '../sources/source.utils';
import { minnow } from '../species/creatures/minnow';
import { seahorse } from '../species/creatures/seahorse';
import type { SpeciesDefinition } from '../species/species.types';
import { getEffect, wakeEffect, wakeProgress } from './effects';
import { spawnCreature, type Creature } from './simulation';
import { deriveTraits } from './traits';

const bounds = { width: 200, height: 100, floor: 90 };
const entity: AquariumEntity = {
	key: 'workflow:1',
	id: '1',
	kind: 'workflow',
	name: 'Test',
	metrics: { ...emptyMetrics(), executionCount: 50, finishedCount: 50 },
};

function swimmer(speed: number, species: SpeciesDefinition = minnow): Creature {
	const creature = spawnCreature(entity, deriveTraits(entity), species, bounds, () => 0.5);
	creature.speed = speed;
	creature.age = 0.3;
	return creature;
}

function pixelsDrawn(creature: Creature): number {
	const ctx = { fillRect: vi.fn(), fillStyle: '', globalAlpha: 1 };
	wakeEffect.draw(ctx as unknown as CanvasRenderingContext2D, creature, 0);
	return ctx.fillRect.mock.calls.length;
}

describe('wakeProgress', () => {
	it('spreads the ripples evenly and repeats them', () => {
		expect(wakeProgress(0, 0)).toBe(0);
		expect(wakeProgress(0, 1)).toBeCloseTo(1 / WAKE.count);
		expect(wakeProgress(WAKE.lifeSeconds, 1)).toBeCloseTo(wakeProgress(0, 1));
	});
});

describe('wakeEffect', () => {
	it('is registered and draws only when zoomed in', () => {
		expect(getEffect('wake')).toBe(wakeEffect);
		expect(wakeEffect.detailOnly).toBe(true);
	});

	it('trails behind a creature that swims fast enough', () => {
		expect(pixelsDrawn(swimmer(WAKE.minSpeed + 5))).toBeGreaterThan(0);
		expect(pixelsDrawn(swimmer(WAKE.minSpeed - 1))).toBe(0);
	});

	it('draws behind the tail, on the side away from the head', () => {
		const creature = swimmer(15);
		creature.facing = 1;
		const ctx = { fillRect: vi.fn(), fillStyle: '', globalAlpha: 1 };
		wakeEffect.draw(ctx as unknown as CanvasRenderingContext2D, creature, 0);
		for (const [x] of ctx.fillRect.mock.calls) expect(x).toBeLessThan(creature.x);
		expect(ctx.globalAlpha).toBe(1);
	});

	it('leaves no wake for drifting, belly-up or sleeping creatures', () => {
		expect(pixelsDrawn(swimmer(15, seahorse))).toBe(0);

		const bellyUp = swimmer(15);
		bellyUp.traits = { ...bellyUp.traits, bellyUp: true };
		expect(pixelsDrawn(bellyUp)).toBe(0);

		const asleep = swimmer(15);
		asleep.entity = { ...entity, metrics: { ...entity.metrics, waitingCount: 1 } };
		expect(pixelsDrawn(asleep)).toBe(0);
	});
});
