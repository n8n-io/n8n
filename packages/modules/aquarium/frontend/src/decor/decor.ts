import { PROP_LAYOUT, TANK_HEALTH } from '../aquarium.constants';
import type { EntityMetrics } from '../aquarium.types';
import type { TankBounds } from '../engine/simulation';
import { hashString } from '../species/species.registry';
import { spriteSize } from '../species/species.types';
import { PROPS, type PropDefinition } from './props';

export interface PlacedProp {
	prop: PropDefinition;
	/** Left edge in tank pixels. */
	x: number;
	/** From 0 to 1. The prop looks dead when the failure share of its tank is above this rank. */
	deathRank: number;
}

const unit = (value: string) => (hashString(value) % 1000) / 1000;

/**
 * Picks the props of a tank and their places from the tank id, so a tank keeps its furniture
 * after a reload. Wide tanks get more props, and no prop shows twice in one tank.
 */
export function layoutProps(bounds: TankBounds, seed: string): PlacedProp[] {
	const count = Math.max(
		1,
		Math.min(PROP_LAYOUT.max, PROPS.length, Math.floor(bounds.width / PROP_LAYOUT.spacing)),
	);
	const slotWidth = bounds.width / count;
	const order = [...PROPS].sort(
		(a, b) => hashString(`${seed}:${a.id}`) - hashString(`${seed}:${b.id}`),
	);

	return order.slice(0, count).map((prop, slot) => {
		const free = Math.max(0, slotWidth - spriteSize(prop.healthy).width);
		return {
			prop,
			x: Math.round(slot * slotWidth + unit(`${seed}:x${slot}`) * free),
			deathRank: unit(`${seed}:death:${prop.id}`),
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
