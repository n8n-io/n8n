import type { ActivitySnapshot, AquariumEntity, EntityActivity } from '../aquarium.types';
import { hashString } from '../species/species.registry';

const SIMULATED_WINDOW_SECONDS = 60;
/** Busiest made-up demo entities peak near this many starts per second. */
const DEMO_PEAK_RATE = 20;
/** Length of one fake traffic wave. */
const WAVE_SECONDS = 40;

/** Starts per second of one entity in one second. */
export type RateAt = (entity: AquariumEntity, second: number) => number;

/** 0 to 1, with a different phase for each entity, so creatures do not change speed together. */
function wave(entityKey: string, second: number): number {
	const phase = (hashString(entityKey) % 100) / 100;
	return 0.5 + 0.5 * Math.sin(2 * Math.PI * (second / WAVE_SECONDS + phase));
}

/** Whole starts for one second. The fraction becomes an extra start in some seconds. */
function startsIn(entityKey: string, rate: number, second: number): number {
	const fraction = (hashString(`${entityKey}:${second}`) % 1000) / 1000;
	return Math.floor(rate) + (fraction < rate % 1 ? 1 : 0);
}

/** Fake live counts from a rate function. Deterministic for a given `now`. */
export function simulateActivity(
	entities: AquariumEntity[],
	now: number,
	rateAt: RateAt,
): ActivitySnapshot {
	const byKey = new Map<string, EntityActivity>();
	const currentSecond = Math.floor(now / 1000);

	for (const entity of entities) {
		if (entity.metrics.executionCount <= 0) continue;

		const startedPerSecond = Array.from({ length: SIMULATED_WINDOW_SECONDS }, (_, i) => {
			const second = currentSecond - SIMULATED_WINDOW_SECONDS + i;
			return startsIn(entity.key, rateAt(entity, second), second);
		});
		const started = startedPerSecond.reduce((total, count) => total + count, 0);
		const failed = Math.round(
			(started * entity.metrics.failedCount) / entity.metrics.executionCount,
		);
		const paused = Math.round(
			(started * entity.metrics.waitingCount) / entity.metrics.executionCount,
		);
		// Little's law: runs in progress = start rate × run time.
		const running = Math.round(
			(rateAt(entity, currentSecond) * entity.metrics.averageRunTimeMs) / 1000,
		);
		byKey.set(entity.key, {
			running,
			started,
			// A paused run has not ended yet, so it is neither a success nor a failure.
			succeeded: Math.max(0, started - failed - paused),
			failed,
			waiting: entity.metrics.waitingCount,
			paused,
			startedPerSecond,
			lastEventAt: now,
		});
	}

	return { windowSeconds: SIMULATED_WINDOW_SECONDS, byKey };
}

/** Made-up traffic that follows the execution count, so busy demo creatures look busy. */
export function demoActivity(entities: AquariumEntity[], now: number): ActivitySnapshot {
	return simulateActivity(entities, now, (entity, second) => {
		const busyness = Math.min(1, Math.log10(1 + entity.metrics.executionCount) / 4);
		return busyness * DEMO_PEAK_RATE * wave(entity.key, second);
	});
}

/**
 * Traffic at each entity's real rate in a data set: its execution count over the data set
 * window. The wave varies it between 0.4 and 1.6 times that rate.
 */
export function datasetActivity(
	entities: AquariumEntity[],
	windowSeconds: number,
	now: number,
): ActivitySnapshot {
	return simulateActivity(entities, now, (entity, second) => {
		const rate = entity.metrics.executionCount / windowSeconds;
		return rate * (0.4 + 1.2 * wave(entity.key, second));
	});
}
