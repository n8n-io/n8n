import type { ActivitySnapshot, AquariumEntity, EntityActivity } from '../aquarium.types';
import { hashString } from '../species/species.registry';

const DEMO_WINDOW_SECONDS = 60;
/** Busiest demo entities peak near this many starts per second. */
const DEMO_PEAK_RATE = 20;
/** Length of one fake traffic wave. */
const DEMO_WAVE_SECONDS = 40;

/** Fake starts in one second. Waves up and down over time, so speed changes are visible. */
function demoStartsAt(entityKey: string, busyness: number, second: number): number {
	const phase = (hashString(entityKey) % 100) / 100;
	const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * (second / DEMO_WAVE_SECONDS + phase));
	const rate = busyness * DEMO_PEAK_RATE * wave;
	// The fraction becomes one extra start in some seconds, so low rates are not always 0.
	const fraction = (hashString(`${entityKey}:${second}`) % 1000) / 1000;
	return Math.floor(rate) + (fraction < rate % 1 ? 1 : 0);
}

/** Fake live counts that follow each entity's execution count, so busy creatures look busy. */
export function demoActivity(
	entities: AquariumEntity[],
	now: number,
	random: () => number = Math.random,
): ActivitySnapshot {
	const byKey = new Map<string, EntityActivity>();
	const currentSecond = Math.floor(now / 1000);

	for (const entity of entities) {
		const busyness = Math.min(1, Math.log10(1 + entity.metrics.executionCount) / 4);
		if (busyness === 0) continue;

		const startedPerSecond = Array.from({ length: DEMO_WINDOW_SECONDS }, (_, i) =>
			demoStartsAt(entity.key, busyness, currentSecond - DEMO_WINDOW_SECONDS + i),
		);
		const started = startedPerSecond.reduce((total, count) => total + count, 0);
		const failureRate =
			entity.metrics.executionCount > 0
				? entity.metrics.failedCount / entity.metrics.executionCount
				: 0;
		const failed = Math.round(started * failureRate);
		byKey.set(entity.key, {
			running: random() < busyness ? 1 + Math.floor(random() * 3) : 0,
			started,
			succeeded: started - failed,
			failed,
			startedPerSecond,
			lastEventAt: now - Math.floor(random() * 5_000),
		});
	}

	return { windowSeconds: DEMO_WINDOW_SECONDS, byKey };
}
