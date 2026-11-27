import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import { ExecutionLimitPolicyAssignment } from '../execution-limit-policy-assignment.entity';
import { ExecutionLimitPolicyGroupAssignment } from '../execution-limit-policy-group-assignment.entity';
import { ExecutionLimitPolicyRepository } from '../execution-limit-policy.repository';
import { assignPolicyToGroup, assignPolicyToProject, insertPolicy } from './policy-rows';

describe('ExecutionLimitPolicyRepository', () => {
	let repository: ExecutionLimitPolicyRepository;
	let dataSource: DataSource;

	const projectsOf = async (policyId: string) =>
		(await dataSource.getRepository(ExecutionLimitPolicyAssignment).findBy({ policyId })).map(
			({ projectId }) => projectId,
		);

	const groupsOf = async (policyId: string) =>
		(await dataSource.getRepository(ExecutionLimitPolicyGroupAssignment).findBy({ policyId })).map(
			({ group }) => group,
		);

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		repository = Container.get(ExecutionLimitPolicyRepository);
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await dataSource.getRepository(ExecutionLimitPolicy).delete({});
		await testDb.truncate(['Project']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findProjectPolicies', () => {
		it('returns an empty list when no policy is assigned', async () => {
			expect(await repository.findProjectPolicies({})).toEqual([]);
		});

		it('returns one row for each assignment with the id, name and maximum of the policy', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const policyId = await insertPolicy({ name: 'Free tier', maxExecutions: 40 });
			await assignPolicyToProject(policyId, first.id);
			await assignPolicyToProject(policyId, second.id);

			const rows = await repository.findProjectPolicies({});

			expect(rows).toHaveLength(2);
			expect(rows).toEqual(
				expect.arrayContaining([
					{ projectId: first.id, policyId, name: 'Free tier', maxExecutions: 40 },
					{ projectId: second.id, policyId, name: 'Free tier', maxExecutions: 40 },
				]),
			);
		});

		it('returns a number for the maximum', async () => {
			const project = await createTeamProject();
			await assignPolicyToProject(await insertPolicy({ maxExecutions: 7 }), project.id);

			const [row] = await repository.findProjectPolicies({});

			expect(typeof row.maxExecutions).toBe('number');
		});

		it('puts the policies of one project together, with the lowest maximum first', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const [high, low, mid] = [
				await insertPolicy({ maxExecutions: 300 }),
				await insertPolicy({ maxExecutions: 20 }),
				await insertPolicy({ maxExecutions: 90 }),
			];
			for (const policyId of [high, low, mid]) {
				await assignPolicyToProject(policyId, first.id);
				await assignPolicyToProject(policyId, second.id);
			}

			const rows = await repository.findProjectPolicies({});

			const projectIds = rows.map(({ projectId }) => projectId);
			expect(projectIds).toEqual([...projectIds].sort());
			for (const projectId of [first.id, second.id]) {
				expect(
					rows.filter((row) => row.projectId === projectId).map(({ policyId }) => policyId),
				).toEqual([low, mid, high]);
			}
		});

		it('orders policies with the same maximum by id', async () => {
			const project = await createTeamProject();
			const [a, b] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToProject(a, project.id);
			await assignPolicyToProject(b, project.id);

			const rows = await repository.findProjectPolicies({});

			expect(rows.map(({ policyId }) => policyId)).toEqual([a, b].sort());
		});

		it('returns only the rows of the given projects', async () => {
			const [first, second, third] = [
				await createTeamProject(),
				await createTeamProject(),
				await createTeamProject(),
			];
			const policyId = await insertPolicy();
			for (const project of [first, second, third]) {
				await assignPolicyToProject(policyId, project.id);
			}

			const rows = await repository.findProjectPolicies({}, [first.id, third.id, 'unknown']);

			expect(rows.map(({ projectId }) => projectId).sort()).toEqual([first.id, third.id].sort());
		});

		it('returns an empty list for an empty list of project ids', async () => {
			const project = await createTeamProject();
			await assignPolicyToProject(await insertPolicy(), project.id);

			expect(await repository.findProjectPolicies({}, [])).toEqual([]);
		});

		it('returns the same rows inside a transaction', async () => {
			const project = await createTeamProject();
			await assignPolicyToProject(await insertPolicy(), project.id);

			const rows = await Container.get(TransactionRunner).run(
				{},
				async (ctx) => await repository.findProjectPolicies(ctx),
			);

			expect(rows).toHaveLength(1);
		});

		it('leaves out a policy with no assignment and a policy with a group assignment only', async () => {
			await insertPolicy();
			await assignPolicyToGroup(await insertPolicy(), 'newProjects');

			expect(await repository.findProjectPolicies({})).toEqual([]);
		});
	});

	describe('policies', () => {
		it('inserts a policy and finds it by id and by name', async () => {
			const id = randomUUID();

			await repository.insertPolicy({ id, name: 'Free tier', maxExecutions: 25 }, {});

			const expected = { id, name: 'Free tier', maxExecutions: 25 };
			expect(await repository.findPolicy(id, {})).toEqual(expected);
			expect(await repository.findPolicyByName('Free tier', {})).toEqual(expected);
		});

		it('returns null for a policy that does not exist', async () => {
			expect(await repository.findPolicy(randomUUID(), {})).toBeNull();
			expect(await repository.findPolicyByName('Unknown', {})).toBeNull();
		});

		it('updates the name and the maximum of a policy', async () => {
			const id = await insertPolicy({ name: 'Old', maxExecutions: 10 });

			await repository.updatePolicy(id, { name: 'New', maxExecutions: 20 }, {});

			expect(await repository.findPolicy(id, {})).toEqual({ id, name: 'New', maxExecutions: 20 });
		});

		it('deletes a policy with its project and group assignments', async () => {
			const project = await createTeamProject();
			const id = await insertPolicy();
			const other = await insertPolicy();
			await assignPolicyToProject(id, project.id);
			await assignPolicyToGroup(id, 'newProjects');
			await assignPolicyToGroup(other, 'personalProjects');

			await repository.deletePolicy(id, {});

			expect(await repository.findPolicy(id, {})).toBeNull();
			expect(await projectsOf(id)).toEqual([]);
			expect(await groupsOf(id)).toEqual([]);
			expect(await groupsOf(other)).toEqual(['personalProjects']);
		});
	});

	describe('project assignments', () => {
		it('gives each project this policy only', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const [old, next] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToProject(old, first.id);

			await repository.replacePoliciesOfProjects(next, [first.id, second.id], {});

			expect(await projectsOf(old)).toEqual([]);
			expect((await projectsOf(next)).sort()).toEqual([first.id, second.id].sort());
		});

		it('leaves the policies of other projects as they are', async () => {
			const [target, other] = [await createTeamProject(), await createTeamProject()];
			const [old, next] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToProject(old, other.id);

			await repository.replacePoliciesOfProjects(next, [target.id], {});

			expect(await projectsOf(old)).toEqual([other.id]);
		});

		it('replaces several policies of one project with one row', async () => {
			const project = await createTeamProject();
			const next = await insertPolicy();
			await assignPolicyToProject(await insertPolicy(), project.id);
			await assignPolicyToProject(await insertPolicy(), project.id);

			await repository.replacePoliciesOfProjects(next, [project.id], {});

			const rows = await repository.findProjectPolicies({});
			expect(rows.map(({ policyId }) => policyId)).toEqual([next]);
		});

		it('rejects a project that does not exist', async () => {
			const policyId = await insertPolicy();

			await expect(
				repository.replacePoliciesOfProjects(policyId, [randomUUID()], {}),
			).rejects.toThrow();
		});

		it('removes the policies of the given projects only', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const policyId = await insertPolicy();
			await assignPolicyToProject(policyId, first.id);
			await assignPolicyToProject(policyId, second.id);

			await repository.deletePoliciesOfProjects([first.id, 'project-with-no-policy'], {});

			expect(await projectsOf(policyId)).toEqual([second.id]);
		});

		it('does nothing for an empty list of projects', async () => {
			const project = await createTeamProject();
			const policyId = await insertPolicy();
			await assignPolicyToProject(policyId, project.id);

			await repository.deletePoliciesOfProjects([], {});
			await repository.replacePoliciesOfProjects(policyId, [], {});

			expect(await projectsOf(policyId)).toEqual([project.id]);
		});
	});

	describe('group assignments', () => {
		it('finds no policy for a group with none', async () => {
			expect(await repository.findGroupPolicyId('newProjects', {})).toBeNull();
		});

		it('finds the policy of the group and not the policy of the other group', async () => {
			const [newProjects, personal] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToGroup(newProjects, 'newProjects');
			await assignPolicyToGroup(personal, 'personalProjects');

			expect(await repository.findGroupPolicyId('newProjects', {})).toBe(newProjects);
			expect(await repository.findGroupPolicyId('personalProjects', {})).toBe(personal);
		});

		it('finds the policy with the lowest maximum when the group has several', async () => {
			const high = await insertPolicy({ maxExecutions: 500 });
			const low = await insertPolicy({ maxExecutions: 5 });
			await assignPolicyToGroup(high, 'newProjects');
			await assignPolicyToGroup(low, 'newProjects');

			expect(await repository.findGroupPolicyId('newProjects', {})).toBe(low);
		});

		it('gives the group this policy only', async () => {
			const [old, next] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToGroup(old, 'newProjects');

			await repository.replaceGroupPolicy(next, 'newProjects', {});

			expect(await groupsOf(old)).toEqual([]);
			expect(await groupsOf(next)).toEqual(['newProjects']);
		});

		it('leaves the other group as it is when it replaces a group policy', async () => {
			const [personal, next] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToGroup(personal, 'personalProjects');

			await repository.replaceGroupPolicy(next, 'newProjects', {});

			expect(await groupsOf(personal)).toEqual(['personalProjects']);
		});

		it('removes the policy of one group only', async () => {
			const [newProjects, personal] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToGroup(newProjects, 'newProjects');
			await assignPolicyToGroup(personal, 'personalProjects');

			await repository.deleteGroupPolicy('newProjects', {});

			expect(await repository.findGroupPolicyId('newProjects', {})).toBeNull();
			expect(await repository.findGroupPolicyId('personalProjects', {})).toBe(personal);
		});
	});
});
