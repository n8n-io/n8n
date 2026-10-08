import fc from 'fast-check';

import {
	pickDefaultRemoteProject,
	reconcileDefaultRemoteProject,
	type RemoteProject,
	type RemoteProjectList,
} from '../remote-project-picker';

// Few ids, so that lists often hold the current project and repeat ids.
const projectArb: fc.Arbitrary<RemoteProject> = fc.record({
	id: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
	name: fc.string({ maxLength: 8 }),
	type: fc.constantFrom('personal' as const, 'team' as const),
});

const listArb: fc.Arbitrary<RemoteProjectList> = fc.record({
	projects: fc.array(projectArb, { maxLength: 8 }),
	teamProjectsEnabled: fc.boolean(),
});

const currentArb = fc.option(
	fc.record({ id: fc.constantFrom('a', 'b', 'f'), name: fc.string({ maxLength: 8 }) }),
	{ nil: null },
);

const isInputOrNull = (result: RemoteProject | null, list: RemoteProjectList) =>
	result === null || list.projects.includes(result);

describe('remote project picker properties', () => {
	it('returns one of the listed projects or null', () => {
		fc.assert(
			fc.property(listArb, currentArb, (list, current) => {
				expect(isInputOrNull(pickDefaultRemoteProject(list), list)).toBe(true);
				expect(isInputOrNull(reconcileDefaultRemoteProject(current, list), list)).toBe(true);
			}),
		);
	});

	it('returns the first team project whenever team projects are licensed and listed', () => {
		fc.assert(
			fc.property(listArb, (list) => {
				const firstTeam = list.projects.find((project) => project.type === 'team');
				fc.pre(list.teamProjectsEnabled && firstTeam !== undefined);

				expect(pickDefaultRemoteProject(list)).toBe(firstTeam);
			}),
		);
	});

	it('never picks a team project without a team licence', () => {
		fc.assert(
			fc.property(listArb, (list) => {
				const unlicensed = { ...list, teamProjectsEnabled: false };

				expect(pickDefaultRemoteProject(unlicensed)?.type ?? 'personal').toBe('personal');
			}),
		);
	});

	it('returns null only when no listed project fits', () => {
		fc.assert(
			fc.property(listArb, (list) => {
				const fits = list.projects.some(
					(project) => project.type === 'personal' || list.teamProjectsEnabled,
				);

				expect(pickDefaultRemoteProject(list) === null).toBe(!fits);
			}),
		);
	});

	it('keeps the current project id while it is listed, else picks like a new link', () => {
		fc.assert(
			fc.property(listArb, currentArb, (list, current) => {
				const listed = list.projects.find((project) => project.id === current?.id);
				const result = reconcileDefaultRemoteProject(current, list);

				expect(result).toBe(listed ?? pickDefaultRemoteProject(list));
			}),
		);
	});
});
