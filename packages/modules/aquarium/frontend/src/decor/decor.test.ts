import { PROP_LAYOUT, TANK_HEALTH } from '../aquarium.constants';
import type { TankBounds } from '../engine/simulation';
import { emptyMetrics } from '../sources/source.utils';
import { spriteSize, validateSprite } from '../species/species.types';
import { isPropDead, layoutProps, tankFailureShare, tankHealthOf } from './decor';
import { PROPS } from './props';

const tank = (width: number): TankBounds => ({ width, height: 120, floor: 110 });

function creature(executionCount: number, failedCount: number) {
	return { entity: { metrics: { ...emptyMetrics(), executionCount, failedCount } } };
}

describe('props', () => {
	it.each(PROPS.map((prop) => [prop.id, prop] as const))('%s has valid sprites', (_, prop) => {
		expect(validateSprite(prop.healthy)).toEqual([]);
		expect(validateSprite(prop.dead)).toEqual([]);
	});
});

describe('layoutProps', () => {
	it('gives a tank the same props after a reload', () => {
		expect(layoutProps(tank(400), 'project-1')).toEqual(layoutProps(tank(400), 'project-1'));
	});

	it('gives wide tanks more props, and no prop twice', () => {
		expect(layoutProps(tank(96), 'p')).toHaveLength(1);

		const wide = layoutProps(tank(2_000), 'p');
		expect(wide).toHaveLength(PROP_LAYOUT.max);
		expect(new Set(wide.map((placed) => placed.prop.id)).size).toBe(wide.length);
	});

	it('keeps every prop inside the tank', () => {
		for (const width of [96, 250, 400, 1_000]) {
			for (const placed of layoutProps(tank(width), `seed-${width}`)) {
				expect(placed.x).toBeGreaterThanOrEqual(0);
				expect(placed.x + spriteSize(placed.prop.healthy).width).toBeLessThanOrEqual(width);
			}
		}
	});
});

describe('tankFailureShare', () => {
	it('is unknown until the tank has enough runs', () => {
		expect(tankFailureShare([creature(TANK_HEALTH.minRuns - 1, 5)])).toBeUndefined();
	});

	it('adds up the runs of every creature in the tank', () => {
		expect(tankFailureShare([creature(30, 3), creature(10, 7)])).toBeCloseTo(0.25);
	});
});

describe('tankHealthOf', () => {
	it.each([
		[undefined, 'neutral'],
		[0, 'positive'],
		[0.1, 'neutral'],
		[TANK_HEALTH.negative, 'negative'],
		[0.5, 'negative'],
		[0.51, 'critical'],
	] as const)('gives a failure share of %s the %s state', (share, health) => {
		expect(tankHealthOf(share)).toBe(health);
	});
});

describe('isPropDead', () => {
	it('kills more props as the failure share grows', () => {
		const props = layoutProps(tank(2_000), 'p');
		const deadAt = (share: number) => props.filter((placed) => isPropDead(placed, share)).length;

		expect(deadAt(0)).toBe(0);
		expect(deadAt(0.5)).toBeGreaterThanOrEqual(deadAt(0.2));
		expect(deadAt(1)).toBe(props.length);
	});
});
