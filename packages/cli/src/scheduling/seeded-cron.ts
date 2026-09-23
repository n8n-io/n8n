import type { CronExpression, TriggerTime } from 'n8n-workflow';
import { createHash } from 'node:crypto';

/**
 * Deterministic integer in `[min, max)` from `seed`+`label`, filling a generated trigger
 * time's unspecified cron fields. Seeded on node identity so the cron string (and thus the
 * job's reconcile-in-place identity) stays stable across re-activation.
 */
function stableInt(seed: string, label: string, min: number, max: number): number {
	const hash = createHash('sha256').update(`${seed}:${label}`).digest();
	return min + (hash.readUInt32BE(0) % (max - min));
}

/**
 * Build a 6-field cron for a trigger time. Generated cadences get a node-seeded (not random)
 * seconds field for a stable job identity; a custom cron is used as-is, widened from 5 to
 * 6 fields when it omits seconds, so every stored expression is one shape.
 */
export function seededCron(item: TriggerTime, seed: string): CronExpression {
	if (item.mode === 'custom') {
		const trimmed = item.cronExpression.trim();
		return (trimmed.split(/\s+/).length === 5 ? `0 ${trimmed}` : trimmed) as CronExpression;
	}

	const second = stableInt(seed, 'second', 0, 60);

	switch (item.mode) {
		case 'everyMinute':
			return `${second} * * * * *`;
		case 'everyHour':
			return `${second} ${item.minute} * * * *`;
		case 'everyX': {
			if (item.unit === 'minutes') return `${second} */${item.value} * * * *`;
			const minute = stableInt(seed, 'minute', 0, 60);
			return `${second} ${minute} */${item.value} * * *`;
		}
		case 'everyDay':
			return `${second} ${item.minute} ${item.hour} * * *`;
		case 'everyWeek':
			return `${second} ${item.minute} ${item.hour} * * ${item.weekday}`;
		case 'everyMonth':
			return `${second} ${item.minute} ${item.hour} ${item.dayOfMonth} * *`;
	}
}
