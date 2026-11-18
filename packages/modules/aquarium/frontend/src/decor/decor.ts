import { PROP_LAYOUT, SCENERY, TANK_HEALTH } from '../aquarium.constants';
import type { EntityMetrics } from '../aquarium.types';
import type { TankBounds } from '../engine/simulation';
import { hashString } from '../species/species.registry';
import { spriteSize } from '../species/species.types';
import { PROPS, type PropDefinition } from './props';
import { BIG_VOLCANO, CORALS, type ScenerySprite } from './scenery';

export interface PlacedProp {
	prop: PropDefinition;
	/** Left edge in tank pixels. */
	x: number;
	/** From 0 to 1. The prop looks dead when the failure share of its tank is above this rank. */
	deathRank: number;
	/** Integer pixel multiplier. Big tanks get bigger props, not more of them. */
	scale: number;
}

/** Big tanks draw furniture, seaweed and waves larger instead of repeating them. */
export function tankScaleOf(bounds: TankBounds): number {
	return Math.max(
		1,
		Math.min(PROP_LAYOUT.maxScale, Math.floor(bounds.height / PROP_LAYOUT.heightPerScale)),
	);
}

const unit = (value: string) => (hashString(value) % 1000) / 1000;

export interface PlacedScenery {
	scenery: ScenerySprite;
	/** Left edge in tank pixels. */
	x: number;
	/** Integer pixel multiplier. Corals take the tank scale, the volcano its own. */
	scale: number;
}

export interface TankScenery {
	/** The big volcano. See `volcanoScaleOf()`. */
	volcano?: PlacedScenery;
	/** Drawn after the volcano, so they stand in front of it. */
	corals: PlacedScenery[];
}

/**
 * The pixel multiplier of the big volcano, or 0 for none. It grows with the tank, up to
 * `volcanoMaxShare` of the height or the width, whichever is smaller. The single tank always gets
 * the largest volcano. Some project tanks get one, a bit smaller or at full size.
 */
export function volcanoScaleOf(bounds: TankBounds, seed: string, single: boolean): number {
	const { width, height } = spriteSize(BIG_VOLCANO.sprite);
	const largest = Math.floor(
		Math.min(
			(bounds.height * SCENERY.volcanoMaxShare) / height,
			(bounds.width * SCENERY.volcanoMaxShare) / width,
		),
	);
	if (largest < 1) return 0;
	if (single) return largest;
	if (unit(`${seed}:volcano`) >= SCENERY.volcanoChance) return 0;
	const share =
		SCENERY.volcanoMinSizeShare + (1 - SCENERY.volcanoMinSizeShare) * unit(`${seed}:volcanoSize`);
	return Math.max(1, Math.round(largest * share));
}

/**
 * Picks the background corals and the big volcano of a tank. The seed is the tank size, because
 * the renderer bakes the scenery into the background, which it caches by size.
 */
export function layoutScenery(bounds: TankBounds, seed: string, single = false): TankScenery {
	const place = (scenery: ScenerySprite, x: number, scale: number): PlacedScenery => {
		const width = spriteSize(scenery.sprite).width * scale;
		return { scenery, x: Math.max(0, Math.min(Math.round(x), bounds.width - width)), scale };
	};

	let volcano: PlacedScenery | undefined;
	const volcanoScale = volcanoScaleOf(bounds, seed, single);
	if (volcanoScale > 0) {
		const free = Math.max(0, bounds.width - spriteSize(BIG_VOLCANO.sprite).width * volcanoScale);
		// Not at the walls: a volcano cut in half looks like a mistake.
		const x = free * (0.15 + 0.7 * unit(`${seed}:volcanoX`));
		volcano = place(BIG_VOLCANO, x, volcanoScale);
	}

	const scale = tankScaleOf(bounds);

	const count = Math.max(1, Math.round(bounds.width / (SCENERY.coralSpacing * scale)));
	const slotWidth = bounds.width / count;
	const corals = Array.from({ length: count }, (_, slot) => {
		const coral = CORALS[hashString(`${seed}:coral${slot}`) % CORALS.length] ?? CORALS[0];
		const free = Math.max(0, slotWidth - spriteSize(coral.sprite).width * scale);
		return place(coral, slot * slotWidth + unit(`${seed}:coralx${slot}`) * free, scale);
	});

	return { volcano, corals };
}

/**
 * Picks the props of a tank and their places from the tank id, so a tank keeps its furniture
 * after a reload. Wide tanks get more props, big tanks get bigger props, and no prop shows twice
 * in one tank. A tank with a big volcano gets no small one.
 */
export function layoutProps(
	bounds: TankBounds,
	seed: string,
	withoutVolcano = false,
): PlacedProp[] {
	const scale = tankScaleOf(bounds);
	// The small volcano would copy the big one in the background.
	const props = withoutVolcano ? PROPS.filter((prop) => prop.id !== 'volcano') : PROPS;
	const count = Math.max(
		1,
		Math.min(
			PROP_LAYOUT.max,
			props.length,
			Math.round(bounds.width / (PROP_LAYOUT.spacing * scale)),
		),
	);
	const slotWidth = bounds.width / count;
	const order = [...props].sort(
		(a, b) => hashString(`${seed}:${a.id}`) - hashString(`${seed}:${b.id}`),
	);

	return order.slice(0, count).map((prop, slot) => {
		const width = spriteSize(prop.healthy).width * scale;
		const free = Math.max(0, slotWidth - width);
		const x = Math.round(slot * slotWidth + unit(`${seed}:x${slot}`) * free);
		return {
			prop,
			// A prop wider than its slot still stays inside the tank.
			x: Math.max(0, Math.min(x, bounds.width - width)),
			deathRank: unit(`${seed}:death:${prop.id}`),
			scale,
		};
	});
}

/**
 * The share of failed runs over all creatures of a tank. Undefined when the tank has too few
 * runs to judge. It runs each frame, so it takes the creatures as they are and allocates nothing.
 */
export function tankFailureShare(
	creatures: ReadonlyArray<{ entity: { metrics: EntityMetrics } }>,
): number | undefined {
	let runs = 0;
	let failed = 0;
	for (const { entity } of creatures) {
		runs += entity.metrics.executionCount;
		failed += entity.metrics.failedCount;
	}
	return runs < TANK_HEALTH.minRuns ? undefined : Math.min(1, failed / runs);
}

/** The "Whole tank" states of the design principles in AGENTS.md. */
export type TankHealth = 'positive' | 'neutral' | 'negative' | 'critical';

export function tankHealthOf(failureShare: number | undefined): TankHealth {
	if (failureShare === undefined) return 'neutral';
	if (failureShare === 0) return 'positive';
	if (failureShare > TANK_HEALTH.critical) return 'critical';
	if (failureShare >= TANK_HEALTH.negative) return 'negative';
	return 'neutral';
}

export function isPropDead(placed: PlacedProp, failureShare: number | undefined): boolean {
	return (failureShare ?? 0) > placed.deathRank;
}
