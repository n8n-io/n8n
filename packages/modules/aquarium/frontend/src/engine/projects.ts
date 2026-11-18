import { SMALL_PROJECTS } from '../aquarium.constants';
import type { AquariumEntity } from '../aquarium.types';

export interface SmallProjectsResult {
	entities: AquariumEntity[];
	hiddenProjects: number;
}

/**
 * Hides projects with fewer than `minCreatures` creatures, but only when there are more than
 * `maxTanks` projects. Entities with no project count as one project, like their tank. Hides
 * nothing if no project would stay.
 */
export function hideSmallProjects(
	entities: AquariumEntity[],
	limits: { maxTanks: number; minCreatures: number } = SMALL_PROJECTS,
): SmallProjectsResult {
	const sizes = new Map<string, number>();
	for (const entity of entities) {
		const id = entity.project?.id ?? '';
		sizes.set(id, (sizes.get(id) ?? 0) + 1);
	}
	if (sizes.size <= limits.maxTanks) return { entities, hiddenProjects: 0 };

	const kept = entities.filter(
		(entity) => (sizes.get(entity.project?.id ?? '') ?? 0) >= limits.minCreatures,
	);
	if (kept.length === 0) return { entities, hiddenProjects: 0 };
	const hiddenProjects = [...sizes.values()].filter((size) => size < limits.minCreatures).length;
	return { entities: kept, hiddenProjects };
}
