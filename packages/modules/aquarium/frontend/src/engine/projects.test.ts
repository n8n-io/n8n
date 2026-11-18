import type { AquariumEntity } from '../aquarium.types';
import { emptyMetrics } from '../sources/source.utils';
import { hideSmallProjects } from './projects';

function entity(id: string, projectId?: string): AquariumEntity {
	return {
		key: `workflow:${id}`,
		id,
		kind: 'workflow',
		name: id,
		metrics: emptyMetrics(),
		project: projectId ? { id: projectId, name: projectId, type: 'team' } : undefined,
	};
}

/** `counts[i]` creatures in project `p<i>`. */
function projects(...counts: number[]): AquariumEntity[] {
	return counts.flatMap((count, p) =>
		Array.from({ length: count }, (_, i) => entity(`p${p}w${i}`, `p${p}`)),
	);
}

const limits = { maxTanks: 3, minCreatures: 3 };

describe('hideSmallProjects', () => {
	it('keeps every project when there are not too many', () => {
		const all = projects(1, 2, 5);

		expect(hideSmallProjects(all, limits)).toEqual({ entities: all, hiddenProjects: 0 });
	});

	it('hides projects with fewer creatures than the minimum when there are too many', () => {
		const result = hideSmallProjects(projects(1, 2, 3, 5), limits);

		expect(result.hiddenProjects).toBe(2);
		expect(new Set(result.entities.map((e) => e.project?.id))).toEqual(new Set(['p2', 'p3']));
	});

	it('counts entities with no project as one project', () => {
		const all = [...projects(5, 5, 5), entity('a'), entity('b')];

		const result = hideSmallProjects(all, limits);

		expect(result.hiddenProjects).toBe(1);
		expect(result.entities.every((e) => e.project)).toBe(true);
	});

	it('hides nothing when every project is small', () => {
		const all = projects(1, 1, 2, 2);

		expect(hideSmallProjects(all, limits)).toEqual({ entities: all, hiddenProjects: 0 });
	});
});
