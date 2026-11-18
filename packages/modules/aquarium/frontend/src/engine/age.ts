import { OLD_WORKFLOW } from '../aquarium.constants';
import type { AquariumEntity } from '../aquarium.types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Age in days, or `undefined` when the entity has no valid creation time. */
export function ageInDays(entity: AquariumEntity, now: number): number | undefined {
	if (!entity.createdAt) return undefined;
	const created = Date.parse(entity.createdAt);
	if (Number.isNaN(created)) return undefined;
	return Math.max(0, (now - created) / DAY_MS);
}

/**
 * Workflows that are old in absolute terms (`minAgeDays`) and relative to the others (in the
 * oldest `oldestShare`). In a young instance, nothing is old; in an old one, only the oldest are.
 */
export function oldWorkflowKeys(entities: AquariumEntity[], now: number): Set<string> {
	const aged = entities.flatMap((entity) => {
		if (entity.kind !== 'workflow') return [];
		const days = ageInDays(entity, now);
		return days === undefined ? [] : [{ key: entity.key, days }];
	});
	if (aged.length === 0) return new Set();

	const oldestFirst = [...aged].sort((a, b) => b.days - a.days);
	// At least one workflow can be old, so a small tank can still have a turtle.
	const allowed = Math.max(1, Math.floor(aged.length * OLD_WORKFLOW.oldestShare));
	const cutoff = oldestFirst[allowed - 1].days;

	return new Set(
		aged
			.filter(({ days }) => days >= OLD_WORKFLOW.minAgeDays && days >= cutoff)
			.map(({ key }) => key),
	);
}
