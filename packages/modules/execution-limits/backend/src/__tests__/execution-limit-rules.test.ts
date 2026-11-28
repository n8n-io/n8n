import {
	diffLimitSettings,
	diffNewProjectsPolicy,
	diffPolicy,
	diffProjectPolicies,
	resolveProjectPolicies,
} from '../execution-limit-rules';
import type { ProjectPolicy } from '../execution-limits.types';

describe('diffLimitSettings', () => {
	const before = {
		periodUnit: 'month' as const,
		instanceMaxExecutions: 100,
	};

	it('returns one change for each setting with a new value', () => {
		const after = { periodUnit: 'week' as const, instanceMaxExecutions: null };

		expect(diffLimitSettings(before, after)).toEqual([
			{ projectId: null, policyId: null, field: 'periodUnit', oldValue: 'month', newValue: 'week' },
			{
				projectId: null,
				policyId: null,
				field: 'instanceMaxExecutions',
				oldValue: 100,
				newValue: null,
			},
		]);
	});

	it('returns nothing when no setting has a new value', () => {
		expect(diffLimitSettings(before, { ...before })).toEqual([]);
	});
});

describe('diffPolicy', () => {
	const free = { name: 'Free', maxExecutions: 10 };

	it('returns the new values for a policy that is created', () => {
		expect(diffPolicy('p1', null, free)).toEqual([
			{ projectId: null, policyId: 'p1', field: 'policy', oldValue: null, newValue: free },
		]);
	});

	it('returns the old values for a policy that is deleted', () => {
		expect(diffPolicy('p1', free, null)).toEqual([
			{ projectId: null, policyId: 'p1', field: 'policy', oldValue: free, newValue: null },
		]);
	});

	it.each([
		['a new name', { name: 'Paid', maxExecutions: 10 }],
		['a new maximum', { name: 'Free', maxExecutions: 20 }],
	])('returns one change for %s', (_, after) => {
		expect(diffPolicy('p1', free, after)).toEqual([
			{ projectId: null, policyId: 'p1', field: 'policy', oldValue: free, newValue: after },
		]);
	});

	it('returns nothing when the name and the maximum stay the same', () => {
		expect(diffPolicy('p1', free, { ...free })).toEqual([]);
	});

	it('leaves other keys of the policy out of the values', () => {
		const withId = { id: 'p1', ...free };

		expect(diffPolicy('p1', null, withId)[0].newValue).toEqual(free);
	});
});

describe('diffProjectPolicies', () => {
	const policyOf = (projectId: string, policyId: string): [string, ProjectPolicy] => [
		projectId,
		{ projectId, policyId, name: policyId, maxExecutions: 1 },
	];

	it('returns one change for each project that gets a policy, with the old policy id', () => {
		const before = new Map([policyOf('changed', 'old'), policyOf('same', 'new')]);

		expect(diffProjectPolicies(['set', 'changed', 'same'], before, 'new')).toEqual([
			{
				projectId: 'set',
				policyId: 'new',
				field: 'projectPolicy',
				oldValue: null,
				newValue: 'new',
			},
			{
				projectId: 'changed',
				policyId: 'new',
				field: 'projectPolicy',
				oldValue: 'old',
				newValue: 'new',
			},
		]);
	});

	it('names the removed policy on a removal and leaves out a project with no policy', () => {
		const before = new Map([policyOf('limited', 'old')]);

		expect(diffProjectPolicies(['limited', 'free'], before, null)).toEqual([
			{
				projectId: 'limited',
				policyId: 'old',
				field: 'projectPolicy',
				oldValue: 'old',
				newValue: null,
			},
		]);
	});

	it('returns one change for a project that occurs two times', () => {
		expect(diffProjectPolicies(['a', 'a'], new Map(), 'new')).toHaveLength(1);
	});
});

describe('diffNewProjectsPolicy', () => {
	it.each([
		[null, 'p1', 'p1'],
		['p1', 'p2', 'p2'],
		['p1', null, 'p1'],
	])('from %s to %s returns one change with policy id %s', (oldPolicyId, newPolicyId, policyId) => {
		expect(diffNewProjectsPolicy(oldPolicyId, newPolicyId)).toEqual([
			{
				projectId: null,
				policyId,
				field: 'newProjectsPolicy',
				oldValue: oldPolicyId,
				newValue: newPolicyId,
			},
		]);
	});

	it.each([[null], ['p1']])('returns nothing when the policy stays %s', (policyId) => {
		expect(diffNewProjectsPolicy(policyId, policyId)).toEqual([]);
	});
});

describe('resolveProjectPolicies', () => {
	const row = (projectId: string, policyId: string, maxExecutions: number): ProjectPolicy => ({
		projectId,
		policyId,
		name: policyId,
		maxExecutions,
	});

	it('returns nothing for no rows', () => {
		expect(resolveProjectPolicies([])).toEqual({
			byProject: new Map(),
			projectsWithSeveralPolicies: [],
		});
	});

	it('keeps the lowest maximum of each project, in any row order', () => {
		const rows = [
			row('a', 'mid', 50),
			row('a', 'low', 5),
			row('a', 'high', 500),
			row('b', 'only', 10),
		];

		const { byProject, projectsWithSeveralPolicies } = resolveProjectPolicies(rows);

		expect(byProject.get('a')).toEqual(rows[1]);
		expect(byProject.get('b')).toEqual(rows[3]);
		expect(projectsWithSeveralPolicies).toEqual(['a']);
	});

	it('keeps the lowest policy id between two policies with the same maximum', () => {
		const rows = [row('a', 'p2', 5), row('a', 'p1', 5)];

		expect(resolveProjectPolicies(rows).byProject.get('a')).toEqual(rows[1]);
	});
});
