import { createHash } from 'node:crypto';

import type { ScheduleDefinition } from './types';
import { InvalidScheduleError } from '../errors';

/**
 * Serialize a schedule to a canonical string key: its kind followed by exactly
 * the fields that define that kind as "the same rule".
 *
 * @param schedule The schedule definition to canonicalize.
 * @returns A stable string key; two schedules are the same rule iff their keys match.
 * @throws {InvalidScheduleError} When the schedule kind is outside the known set.
 */
function canonicalDefinition(schedule: ScheduleDefinition): string {
	const parts: Array<string | number | null> = [schedule.kind];
	switch (schedule.kind) {
		case 'cron':
			parts.push(schedule.cronExpression, schedule.timezone);
			break;
		case 'recurring_cron':
			parts.push(
				schedule.cronExpression,
				schedule.timezone,
				schedule.recurrenceUnit,
				schedule.recurrenceSize,
			);
			break;
		case 'interval':
			parts.push(schedule.intervalSeconds);
			break;
		case 'one_off':
			parts.push(schedule.fireAt.getTime());
			break;
		default: {
			const exhaustive: never = schedule;
			throw new InvalidScheduleError(`Unexpected schedule kind: ${JSON.stringify(exhaustive)}`);
		}
	}
	return JSON.stringify(parts);
}

/**
 * Whether two schedules are the same rule: same kind and same per-kind fields.
 *
 * @param a The first schedule definition.
 * @param b The second schedule definition.
 * @returns `true` when both canonicalize identically.
 */
export function sameSchedule(a: ScheduleDefinition, b: ScheduleDefinition): boolean {
	return canonicalDefinition(a) === canonicalDefinition(b);
}

/**
 * A short digest of a schedule definition plus its clock liveness.
 *
 * Deterministic by construction: a pure digest of the definition, with no
 * instance-local input. Every instance computing the same rule produces the
 * same fingerprint, which is what lets provisioning on one main match rows
 * written by another (leader takeover, concurrent activation).
 *
 * Not unique on its own: identical rules collide by design.
 * Callers scope it (e.g. by workflow and node) and append an ordinal for exact duplicates.
 *
 * @param schedule The schedule definition to fingerprint.
 * @param live Whether the rule has a live clock; a clock-dead rule (no next run) fingerprints differently, so a live<>dead transition reads as a changed rule.
 * @returns A 16-hex-character digest of the definition and its liveness.
 */
export function scheduleFingerprint(schedule: ScheduleDefinition, live: boolean): string {
	const identity = `${canonicalDefinition(schedule)}:${live ? 'live' : 'dead'}`;
	return createHash('sha256').update(identity).digest('hex').slice(0, 16);
}
