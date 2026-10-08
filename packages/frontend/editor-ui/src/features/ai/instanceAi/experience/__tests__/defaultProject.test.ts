import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Scope } from '@n8n/permissions';
import type { ProjectType } from '@/features/collaboration/projects/projects.types';
import {
	chooseDefaultProject,
	toDefaultProjectCandidates,
	type DefaultProjectCandidate,
} from '../defaultProject';

const PERSONAL = 'personal-1';

const team = (id: string, canCreateWorkflow = true): DefaultProjectCandidate => ({
	id,
	type: 'team',
	canCreateWorkflow,
});

describe('chooseDefaultProject', () => {
	it('uses the URL project first, also over a last-used team project', () => {
		expect(
			chooseDefaultProject({
				queryProjectId: 'from-url',
				lastUsedProjectId: 'team-a',
				projects: [team('team-a')],
				personalProjectId: PERSONAL,
			}),
		).toBe('from-url');
	});

	it('uses the last-used team project while the user can create workflows in it', () => {
		expect(
			chooseDefaultProject({
				lastUsedProjectId: 'team-b',
				projects: [team('team-a'), team('team-b')],
				personalProjectId: PERSONAL,
			}),
		).toBe('team-b');
	});

	it('uses the personal project when the user cannot create workflows in the last-used project', () => {
		expect(
			chooseDefaultProject({
				lastUsedProjectId: 'team-a',
				projects: [team('team-a', false)],
				personalProjectId: PERSONAL,
			}),
		).toBe(PERSONAL);
	});

	it('uses the personal project when the last-used project was deleted or left', () => {
		expect(
			chooseDefaultProject({
				lastUsedProjectId: 'team-gone',
				projects: [team('team-a')],
				personalProjectId: PERSONAL,
			}),
		).toBe(PERSONAL);
	});

	it.each<ProjectType>(['personal', 'public'])(
		'uses only a team project, not a remembered %s project',
		(type) => {
			expect(
				chooseDefaultProject({
					lastUsedProjectId: 'other-1',
					projects: [{ id: 'other-1', type, canCreateWorkflow: true }],
					personalProjectId: PERSONAL,
				}),
			).toBe(PERSONAL);
		},
	);

	it('uses the personal project when no project is remembered', () => {
		expect(chooseDefaultProject({ projects: [team('team-a')], personalProjectId: PERSONAL })).toBe(
			PERSONAL,
		);
	});

	it('treats an empty remembered project as absent, also when a project has an empty id', () => {
		expect(
			chooseDefaultProject({
				lastUsedProjectId: '',
				projects: [team('')],
				personalProjectId: PERSONAL,
			}),
		).toBe(PERSONAL);
	});

	it('treats an empty URL project as absent', () => {
		expect(
			chooseDefaultProject({
				queryProjectId: '',
				lastUsedProjectId: 'team-a',
				projects: [team('team-a')],
				personalProjectId: PERSONAL,
			}),
		).toBe('team-a');
	});

	it('gives no project when nothing applies and the personal project is not loaded', () => {
		expect(chooseDefaultProject({ lastUsedProjectId: 'team-a', projects: [] })).toBeUndefined();
	});

	describe('properties', () => {
		// A small id pool, so that the remembered id often matches a listed project.
		const idArb = fc.oneof(
			fc.constantFrom('team-a', 'team-b', 'personal-1', 'public-1', ''),
			fc.string({ maxLength: 6 }),
		);
		const candidateArb = fc.record({
			id: idArb,
			type: fc.constantFrom<ProjectType>('personal', 'team', 'public'),
			canCreateWorkflow: fc.boolean(),
		});
		const inputArb = fc.record({
			queryProjectId: fc.option(idArb, { nil: undefined }),
			lastUsedProjectId: fc.option(idArb, { nil: undefined }),
			projects: fc.array(candidateArb, { maxLength: 6 }),
			personalProjectId: fc.option(idArb, { nil: undefined }),
		});
		const isEligible = (project: DefaultProjectCandidate) =>
			project.type === 'team' && project.canCreateWorkflow;

		it('gives the URL project, a team project with create rights, or the personal project', () => {
			fc.assert(
				fc.property(inputArb, (input) => {
					const result = chooseDefaultProject(input);
					const allowed = [
						input.queryProjectId,
						input.personalProjectId,
						...input.projects.filter(isEligible).map(({ id }) => id),
					];
					expect(allowed).toContain(result);
				}),
			);
		});

		it('always gives a non-empty URL project', () => {
			fc.assert(
				fc.property(inputArb, fc.string({ minLength: 1 }), (input, queryProjectId) => {
					expect(chooseDefaultProject({ ...input, queryProjectId })).toBe(queryProjectId);
				}),
			);
		});

		it('without a URL project, gives the last-used project exactly when it is eligible', () => {
			fc.assert(
				fc.property(inputArb, (input) => {
					const withoutQuery = { ...input, queryProjectId: undefined };
					const eligible =
						!!input.lastUsedProjectId &&
						input.projects.some(
							(project) => project.id === input.lastUsedProjectId && isEligible(project),
						);
					const result = chooseDefaultProject(withoutQuery);
					expect(result).toBe(eligible ? input.lastUsedProjectId : input.personalProjectId);
				}),
			);
		});
	});
});

describe('toDefaultProjectCandidates', () => {
	const project = (id: string, type: ProjectType, scopes?: Scope[]) => ({ id, type, scopes });

	it('gives no candidate without the team-project licence', () => {
		const projects = [project('team-a', 'team', ['workflow:create'])];

		expect(toDefaultProjectCandidates(projects, false)).toEqual([]);
	});

	it('reads the workflow create right from the project scopes', () => {
		const projects = [
			project('team-a', 'team', ['workflow:read', 'workflow:create']),
			project('team-b', 'team', ['workflow:read', 'credential:create']),
			project('team-c', 'team'),
			project('personal-1', 'personal', ['workflow:create']),
		];

		expect(toDefaultProjectCandidates(projects, true)).toEqual([
			{ id: 'team-a', type: 'team', canCreateWorkflow: true },
			{ id: 'team-b', type: 'team', canCreateWorkflow: false },
			{ id: 'team-c', type: 'team', canCreateWorkflow: false },
			{ id: 'personal-1', type: 'personal', canCreateWorkflow: true },
		]);
	});
});
