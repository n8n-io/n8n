import { PROJECT_TANK, SAND_HEIGHT } from '../aquarium.constants';
import { FRAME_THICKNESS } from './frames';
import { packTanks, projectTankSize, regionAt, type TankContent, type TankRegion } from './layout';

/** How far a tank is from the 16:9 shape that tanks prefer: 1 when it matches. */
function offShape(width: number, height: number): number {
	const ratio = width / height / PROJECT_TANK.aspect;
	return Math.max(ratio, 1 / ratio);
}

/** The tank plus its frame. */
function outer(region: TankRegion) {
	const border = FRAME_THICKNESS[region.frame];
	return {
		left: region.x - border,
		top: region.y - border,
		right: region.x + region.bounds.width + border,
		bottom: region.y + region.bounds.height + border,
	};
}

const content = (
	id: string,
	creatureArea: number,
	extra: Partial<TankContent> = {},
): TankContent => ({
	id,
	label: id,
	creatureArea,
	widestCreature: 10,
	tallestCreature: 5,
	...extra,
});

describe('projectTankSize', () => {
	it('has a minimum size for a small project', () => {
		// The height follows the width, so the smallest tank has the same shape as the others.
		expect(projectTankSize(content('a', 50))).toEqual({
			width: PROJECT_TANK.minWidth,
			height: Math.ceil(PROJECT_TANK.minWidth / PROJECT_TANK.aspect),
		});
	});

	it('grows with the creature area', () => {
		const small = projectTankSize(content('a', 500));
		const big = projectTankSize(content('b', 50_000));

		expect(big.width * big.height).toBeGreaterThan(small.width * small.height * 10);
	});

	it('fits the biggest creature with room to turn and the sand below', () => {
		const size = projectTankSize(content('a', 50, { widestCreature: 64, tallestCreature: 28 }));

		expect(size.width).toBeGreaterThanOrEqual(64 + 2 * PROJECT_TANK.margin);
		expect(size.height).toBeGreaterThanOrEqual(28 + SAND_HEIGHT + 2 * PROJECT_TANK.margin);
	});
});

describe('packTanks', () => {
	const contents = Array.from({ length: 40 }, (_, i) => content(`p${i}`, (i + 1) * 400));

	it('places every tank and its frame inside the world, without overlaps', () => {
		const { regions, world } = packTanks(contents, 2);

		expect(regions).toHaveLength(contents.length);
		for (const region of regions) {
			const a = outer(region);
			expect(a.left).toBeGreaterThanOrEqual(0);
			expect(a.top).toBeGreaterThanOrEqual(0);
			expect(a.right).toBeLessThanOrEqual(world.width);
			expect(a.bottom).toBeLessThanOrEqual(world.height);
			for (const other of regions) {
				if (other === region) continue;
				const b = outer(other);
				const overlaps =
					a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
				expect(overlaps).toBe(false);
			}
		}
	});

	it('gives the same wall for the same tanks', () => {
		expect(packTanks(contents, 2)).toEqual(packTanks([...contents].reverse(), 2));
	});

	it('fills the wall, with no holes beyond the gaps', () => {
		const { regions, world } = packTanks(contents, 2);
		const used = regions.reduce((sum, region) => {
			const box = outer(region);
			const gap = PROJECT_TANK.gap;
			return sum + (box.right - box.left + gap) * (box.bottom - box.top + gap);
		}, 0);

		expect(used / (world.width * world.height)).toBeGreaterThan(0.95);
	});

	it('keeps tanks close to their needed area and not too stretched', () => {
		const { regions } = packTanks(contents, 2);

		for (const region of regions) {
			expect(offShape(region.bounds.width, region.bounds.height)).toBeLessThan(4);
		}
	});

	it('avoids slivers on a small wall', () => {
		const few = [
			content('support', 400, { tallestCreature: 10 }),
			content('sales', 2_000),
			content('data', 4_500, { widestCreature: 32, tallestCreature: 14 }),
			content('ops', 600),
		];
		const { regions } = packTanks(few, 1400 / 640);

		for (const region of regions) {
			expect(offShape(region.bounds.width, region.bounds.height)).toBeLessThan(3);
			expect(region.bounds.height).toBeGreaterThan(SAND_HEIGHT * 2);
		}
	});

	it('keeps most tanks at least the minimum width', () => {
		const { regions } = packTanks(contents, 2);
		const narrow = regions.filter((region) => region.bounds.width < PROJECT_TANK.minWidth);

		expect(narrow.length).toBeLessThanOrEqual(contents.length * 0.1);
	});

	it('mixes big and small tanks instead of sorting them by size', () => {
		const { regions } = packTanks(contents, 2);
		const areaOf = (r: TankRegion) => r.bounds.width * r.bounds.height;
		const byPosition = [...regions].sort((a, b) => a.y - b.y || a.x - b.x).map(areaOf);
		const bySize = [...byPosition].sort((a, b) => b - a);

		expect(byPosition).not.toEqual(bySize);
	});

	it('gives each tank a frame', () => {
		const { regions } = packTanks(contents, 2);

		expect(regions.every((region) => region.frame !== 'none')).toBe(true);
	});

	it('makes a wall with about the aspect ratio of the screen', () => {
		const wide = packTanks(contents, 2).world;
		const tall = packTanks(contents, 0.5).world;

		expect(wide.width / wide.height).toBeGreaterThan(1.2);
		expect(tall.width / tall.height).toBeLessThan(1);
	});

	it('gives each tank a floor above the sand', () => {
		const [region] = packTanks([content('a', 100)], 1).regions;

		expect(region.bounds.floor).toBe(region.bounds.height - SAND_HEIGHT);
	});

	it('finds the tank under a point, and none in the gap', () => {
		const { regions } = packTanks([content('a', 100), content('b', 100)], 4);
		const [first] = regions;

		expect(regionAt(regions, first.x + 1, first.y + 1)?.id).toBe(first.id);
		expect(regionAt(regions, 0, 0)).toBeUndefined();
	});

	it('returns an empty wall for no tanks', () => {
		expect(packTanks([], 2).regions).toEqual([]);
	});
});
