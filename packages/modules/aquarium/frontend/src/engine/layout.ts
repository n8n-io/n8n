import { PROJECT_TANK, SAND_HEIGHT, ZOOM } from '../aquarium.constants';
import { hashString } from '../species/species.registry';
import type { Size } from './camera';
import { FRAME_THICKNESS, frameStyleFor, type FrameStyle } from './frames';
import type { TankBounds } from './simulation';

/** What a tank must hold. */
export interface TankContent {
	id: string;
	label: string;
	/** Sum of the sprite areas of its creatures, in logical pixels. */
	creatureArea: number;
	widestCreature: number;
	tallestCreature: number;
}

/** A tank on the wall. `x` and `y` are world coordinates; creatures use `bounds` locally. */
export interface TankRegion {
	id: string;
	label: string;
	x: number;
	y: number;
	bounds: TankBounds;
	/** Drawn around the tank, outside `bounds`. */
	frame: FrameStyle;
}

function boundsOf(size: Size): TankBounds {
	return { ...size, floor: size.height - SAND_HEIGHT };
}

/** Grows with the creature area, like the single tank, but starts from a small minimum. */
export function projectTankSize(content: TankContent): Size {
	const area = content.creatureArea / ZOOM.creatureCoverage;
	let width = Math.max(PROJECT_TANK.minWidth, Math.ceil(Math.sqrt(area * PROJECT_TANK.aspect)));
	// From the width, so small tanks keep the same shape as big ones.
	let height = Math.max(PROJECT_TANK.minHeight, Math.ceil(width / PROJECT_TANK.aspect));
	// The biggest creature must fit, with room to turn and the sand below it.
	width = Math.max(width, content.widestCreature + 2 * PROJECT_TANK.margin);
	height = Math.max(height, content.tallestCreature + SAND_HEIGHT + 2 * PROJECT_TANK.margin);
	return { width, height };
}

/** 0 to 1, stable for a tank id, so the wall looks the same after a reload. */
function random(id: string, salt: string): number {
	return (hashString(`${salt}:${id}`) % 10_000) / 10_000;
}

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface PackItem {
	content: TankContent;
	frame: FrameStyle;
	border: number;
	/** Area that the tank, its frame and its share of the gaps need. */
	weight: number;
	/** Smallest cell that holds the tank at its minimum size, with frame and gap. */
	minCellWidth: number;
	minCellHeight: number;
	/** Width over height of the cell that the tank would like. Small tanks are wide. */
	aspect: number;
}

/** How far a rectangle is from a shape: 1 when it matches, larger when stretched. */
function stretch(width: number, height: number, aspect = 1): number {
	const ratio = width / height / aspect;
	return Math.max(ratio, 1 / ratio);
}

/** How much a split point off the target weight costs, against how stretched the halves get. */
const SPLIT_BALANCE_WEIGHT = 4;

/** Groups up to this size are searched fully, so their tanks do not end up as slivers. */
const LOOKAHEAD_ITEMS = 5;

interface Cut {
	score: number;
	split: number;
	first: Rect;
	second: Rect;
}

/** Small groups go biggest first, so the contiguous splits can pair big and small tanks well. */
function ordered(items: PackItem[]): PackItem[] {
	return items.length <= LOOKAHEAD_ITEMS ? [...items].sort((a, b) => b.weight - a.weight) : items;
}

/** How much a cell smaller than its tank's minimum costs, for each share it is too small. */
const SMALL_CELL_WEIGHT = 8;

/** Cost of a cell that is narrower or lower than the minimum of the given size. */
function shortfall(rect: Rect, minWidth: number, minHeight: number): number {
	return (
		SMALL_CELL_WEIGHT *
		(Math.max(0, minWidth / rect.width - 1) + Math.max(0, minHeight / rect.height - 1))
	);
}

/**
 * How good a rectangle is for a group: its shape for one tank, with a cost when it is narrower
 * than the tank's minimum; the best cut inside it for a small group; else its shape.
 */
function groupScore(items: PackItem[], rect: Rect): number {
	if (items.length === 1) {
		const [item] = items;
		return (
			stretch(rect.width, rect.height, item.aspect) +
			shortfall(rect, item.minCellWidth, item.minCellHeight)
		);
	}
	if (items.length > LOOKAHEAD_ITEMS) {
		// A strip smaller than its most demanding tank forces a small cell later.
		const widest = Math.max(...items.map((item) => item.minCellWidth));
		const tallest = Math.max(...items.map((item) => item.minCellHeight));
		return stretch(rect.width, rect.height) + shortfall(rect, widest, tallest);
	}
	return bestCut(items, rect)?.score ?? stretch(rect.width, rect.height);
}

/**
 * Tries every split point and both cut directions. A cut scores well when its halves suit their
 * groups and its weight is close to a target between 40% and 60%. The varied target makes the
 * wall look less computed.
 */
function bestCut(items: PackItem[], rect: Rect): Cut | undefined {
	const total = items.reduce((sum, item) => sum + item.weight, 0);
	const target = 0.4 + 0.2 * random(items[0].content.id, `split${items.length}`);
	let best: Cut | undefined;
	let before = 0;

	for (let split = 1; split < items.length; split++) {
		before += items[split - 1].weight;
		const ratio = before / total;
		const firstItems = ordered(items.slice(0, split));
		const secondItems = ordered(items.slice(split));
		const cuts = [
			{
				first: { ...rect, width: rect.width * ratio },
				second: { ...rect, x: rect.x + rect.width * ratio, width: rect.width * (1 - ratio) },
			},
			{
				first: { ...rect, height: rect.height * ratio },
				second: { ...rect, y: rect.y + rect.height * ratio, height: rect.height * (1 - ratio) },
			},
		];
		for (const cut of cuts) {
			const score =
				Math.max(groupScore(firstItems, cut.first), groupScore(secondItems, cut.second)) +
				SPLIT_BALANCE_WEIGHT * Math.abs(ratio - target);
			if (!best || score < best.score) best = { score, split, ...cut };
		}
	}
	return best;
}

/** Splits the items and the rectangle with them until each item has its own cell. */
function bisect(items: PackItem[], rect: Rect, cells: Array<{ item: PackItem; rect: Rect }>) {
	if (items.length === 1) {
		cells.push({ item: items[0], rect });
		return;
	}
	const sorted = ordered(items);
	const cut = bestCut(sorted, rect);
	if (!cut) return;
	bisect(sorted.slice(0, cut.split), cut.first, cells);
	bisect(sorted.slice(cut.split), cut.second, cells);
}

/**
 * Fills a wall with the shape of the screen, like a treemap. Each tank gets a cell with the area
 * that it needs, so the wall has no holes. The order is shuffled by project id, so big and small
 * tanks mix, and the result is the same for the same projects.
 */
export function packTanks(
	contents: TankContent[],
	targetAspect: number,
): { regions: TankRegion[]; world: Size } {
	if (contents.length === 0) return { regions: [], world: { width: 1, height: 1 } };

	const gap = PROJECT_TANK.gap;
	const items: PackItem[] = contents
		.map((content) => {
			const size = projectTankSize(content);
			const frame = frameStyleFor(content.id);
			const border = FRAME_THICKNESS[frame];
			const minWidth = Math.max(
				PROJECT_TANK.minWidth,
				content.widestCreature + 2 * PROJECT_TANK.margin,
			);
			const cell = { width: size.width + 2 * border + gap, height: size.height + 2 * border + gap };
			return {
				content,
				frame,
				border,
				weight: cell.width * cell.height,
				minCellWidth: minWidth + 2 * border + gap,
				minCellHeight:
					Math.max(
						PROJECT_TANK.minHeight,
						content.tallestCreature + SAND_HEIGHT + 2 * PROJECT_TANK.margin,
					) +
					2 * border +
					gap,
				aspect: cell.width / cell.height,
			};
		})
		// Sort first, so the shuffle does not depend on the input order.
		.sort((a, b) => a.content.id.localeCompare(b.content.id))
		.map((item) => ({ item, key: random(item.content.id, 'order') }))
		.sort((a, b) => a.key - b.key)
		.map(({ item }) => item);

	const total = items.reduce((sum, item) => sum + item.weight, 0);
	const width = Math.ceil(Math.sqrt(total * targetAspect));
	const height = Math.ceil(total / width);

	const cells: Array<{ item: PackItem; rect: Rect }> = [];
	bisect(items, { x: 0, y: 0, width, height }, cells);

	const regions = cells.map(({ item, rect }) => {
		// Round the cell edges, not the sizes, so neighbours share an edge exactly.
		const left = Math.round(rect.x);
		const top = Math.round(rect.y);
		const right = Math.round(rect.x + rect.width);
		const bottom = Math.round(rect.y + rect.height);
		const inset = item.border + gap / 2;
		const size = {
			width: Math.max(1, right - left - 2 * inset),
			height: Math.max(SAND_HEIGHT + 1, bottom - top - 2 * inset),
		};
		return {
			id: item.content.id,
			label: item.content.label,
			x: left + inset + gap / 2,
			y: top + inset + gap / 2,
			bounds: boundsOf(size),
			frame: item.frame,
		};
	});

	return { regions, world: { width: width + gap, height: height + gap } };
}

/** The tank that contains a world point, if any. */
export function regionAt(regions: TankRegion[], x: number, y: number): TankRegion | undefined {
	return regions.find(
		(r) => x >= r.x && x < r.x + r.bounds.width && y >= r.y && y < r.y + r.bounds.height,
	);
}

/** The single tank fills the whole world. */
export function singleRegion(id: string, size: Size): TankRegion {
	return { id, label: '', x: 0, y: 0, bounds: boundsOf(size), frame: 'none' };
}
