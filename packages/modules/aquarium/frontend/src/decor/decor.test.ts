import { PROP_LAYOUT, SCENERY, TANK_HEALTH } from '../aquarium.constants';
import type { TankBounds } from '../engine/simulation';
import { emptyMetrics } from '../sources/source.utils';
import { spriteSize, validateSprite } from '../species/species.types';
import {
	isPropDead,
	layoutProps,
	layoutScenery,
	tankFailureShare,
	tankHealthOf,
	tankScaleOf,
	volcanoScaleOf,
} from './decor';
import { PROPS } from './props';
import { BIG_VOLCANO, BIG_VOLCANO_CRATER, CORALS } from './scenery';

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
				expect(placed.x + spriteSize(placed.prop.healthy).width * placed.scale).toBeLessThanOrEqual(
					width,
				);
			}
		}
	});
});

describe('tankScaleOf', () => {
	it('keeps small tanks at scale 1 and draws big tanks larger', () => {
		expect(tankScaleOf({ width: 96, height: 54, floor: 44 })).toBe(1);
		expect(tankScaleOf({ width: 400, height: 120, floor: 110 })).toBe(1);
		expect(tankScaleOf({ width: 400, height: 240, floor: 230 })).toBe(2);
		expect(tankScaleOf({ width: 4_000, height: 2_000, floor: 1_990 })).toBe(PROP_LAYOUT.maxScale);
	});

	it('gives a big tank fewer, bigger props than a small tank of the same width', () => {
		const small = layoutProps({ width: 400, height: 54, floor: 44 }, 'p');
		const big = layoutProps({ width: 400, height: 240, floor: 230 }, 'p');

		expect(big.length).toBeLessThan(small.length);
		expect(big[0]?.scale).toBeGreaterThan(1);
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

describe('scenery', () => {
	it.each(CORALS.map((coral, index) => [index, coral] as const))(
		'coral %d has a valid sprite',
		(_, coral) => {
			expect(validateSprite(coral.sprite)).toEqual([]);
		},
	);

	it('has a valid volcano with lava at its crater', () => {
		expect(validateSprite(BIG_VOLCANO.sprite)).toEqual([]);
		const crater = BIG_VOLCANO.sprite.frames[0]?.[BIG_VOLCANO_CRATER.y]?.[BIG_VOLCANO_CRATER.x];
		expect(BIG_VOLCANO.glow).toContain(crater);
	});
});

describe('volcanoScaleOf', () => {
	const volcano = spriteSize(BIG_VOLCANO.sprite);
	const seeds = Array.from({ length: 400 }, (_, i) => `seed-${i}`);

	it('gives the single tank the largest volcano that fits in half its height and width', () => {
		// Half the height allows 4, half the width allows 5: the smaller one wins.
		const bounds = { width: volcano.width * 10, height: volcano.height * 8, floor: 0 };
		expect(volcanoScaleOf(bounds, 'a', true)).toBe(4);
		expect(volcanoScaleOf({ ...bounds, width: volcano.width * 6 }, 'a', true)).toBe(3);
	});

	it('gives no volcano to a tank too small for one at half its size', () => {
		const small = { width: volcano.width * 2 - 1, height: volcano.height * 10, floor: 0 };
		expect(volcanoScaleOf(small, 'a', true)).toBe(0);
	});

	it('gives a volcano to fewer than half of the project tanks, a bit smaller or at full size', () => {
		const bounds = { width: volcano.width * 20, height: volcano.height * 20, floor: 0 };
		const scales = seeds.map((seed) => volcanoScaleOf(bounds, seed, false));
		const withVolcano = scales.filter((scale) => scale > 0);

		expect(withVolcano.length).toBeGreaterThan(0);
		expect(withVolcano.length).toBeLessThan(seeds.length / 2);
		for (const scale of withVolcano) {
			expect(scale).toBeLessThanOrEqual(10);
			expect(scale).toBeGreaterThanOrEqual(Math.round(10 * SCENERY.volcanoMinSizeShare));
		}
		expect(new Set(withVolcano).size).toBeGreaterThan(1);
	});
});

describe('layoutScenery', () => {
	const bounds = { width: 400, height: 210, floor: 200 };

	it('gives a tank of one size the same scenery each time', () => {
		expect(layoutScenery(bounds, '400x210')).toEqual(layoutScenery(bounds, '400x210'));
	});

	it('always gives the single tank a volcano when it fits', () => {
		expect(layoutScenery(bounds, 'a', true).volcano).toBeDefined();
	});

	it('keeps the volcano and the corals inside the tank', () => {
		for (const width of [96, 250, 400, 1_000]) {
			const tank = { width, height: 250, floor: 240 };
			for (const single of [true, false]) {
				const { volcano, corals } = layoutScenery(tank, `seed-${width}`, single);
				for (const placed of [...corals, ...(volcano ? [volcano] : [])]) {
					const placedWidth = spriteSize(placed.scenery.sprite).width * placed.scale;
					expect(placed.x).toBeGreaterThanOrEqual(0);
					expect(placed.x + placedWidth).toBeLessThanOrEqual(width);
				}
			}
		}
	});

	it('gives wide tanks more corals', () => {
		expect(layoutScenery({ ...bounds, width: 1_000 }, 'a').corals.length).toBeGreaterThan(
			layoutScenery({ ...bounds, width: 100 }, 'a').corals.length,
		);
	});
});

describe('layoutProps with a big volcano', () => {
	it('leaves out the small volcano prop', () => {
		const tank = { width: 2_000, height: 300, floor: 290 };
		for (const seed of ['a', 'b', 'c', 'd', 'e']) {
			const ids = layoutProps(tank, seed, true).map((placed) => placed.prop.id);
			expect(ids).not.toContain('volcano');
		}
	});
});
