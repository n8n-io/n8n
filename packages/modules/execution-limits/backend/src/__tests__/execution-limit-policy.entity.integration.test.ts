import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import { ExecutionLimitPolicyAssignment } from '../execution-limit-policy-assignment.entity';
import { ExecutionLimitPolicyGroupAssignment } from '../execution-limit-policy-group-assignment.entity';
import { assignPolicyToProject, insertPolicy } from './policy-rows';

describe('ExecutionLimitPolicy entities', () => {
	let policies: Repository<ExecutionLimitPolicy>;
	let assignments: Repository<ExecutionLimitPolicyAssignment>;
	let groupAssignments: Repository<ExecutionLimitPolicyGroupAssignment>;

	const countRows = async (policyId: string) => ({
		policies: await policies.countBy({ id: policyId }),
		projects: await assignments.countBy({ policyId }),
		groups: await groupAssignments.countBy({ policyId }),
	});

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		const dataSource = Container.get(DataSource);
		policies = dataSource.getRepository(ExecutionLimitPolicy);
		assignments = dataSource.getRepository(ExecutionLimitPolicyAssignment);
		groupAssignments = dataSource.getRepository(ExecutionLimitPolicyGroupAssignment);
	});

	beforeEach(async () => {
		await policies.delete({});
		await testDb.truncate(['Project']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('reads a policy back with its name, maximum and dates', async () => {
		const id = await insertPolicy({ name: 'Free tier', maxExecutions: 250 });

		const policy = await policies.findOneByOrFail({ id });

		expect(policy).toMatchObject({ id, name: 'Free tier', maxExecutions: 250 });
		expect(policy.createdAt).toBeInstanceOf(Date);
		expect(policy.updatedAt).toBeInstanceOf(Date);
	});

	it('reads a project assignment back', async () => {
		const policyId = await insertPolicy();
		const project = await createTeamProject();
		await assignPolicyToProject(policyId, project.id);

		const assignment = await assignments.findOneByOrFail({ policyId });

		expect(assignment).toMatchObject({ policyId, projectId: project.id });
		expect(assignment.createdAt).toBeInstanceOf(Date);
	});

	it.each(['newProjects', 'personalProjects'] as const)(
		'reads a %s group assignment back',
		async (group) => {
			const policyId = await insertPolicy();
			await groupAssignments.insert({ policyId, group });

			const assignment = await groupAssignments.findOneByOrFail({ policyId });

			expect(assignment).toMatchObject({ policyId, group });
			expect(assignment.createdAt).toBeInstanceOf(Date);
		},
	);

	it('removes the assignments of a project when the project is deleted', async () => {
		const policyId = await insertPolicy();
		const project = await createTeamProject();
		await assignPolicyToProject(policyId, project.id);

		await testDb.truncate(['Project']);

		expect(await countRows(policyId)).toEqual({ policies: 1, projects: 0, groups: 0 });
	});

	it('removes the rows of both assignment tables when the policy is deleted', async () => {
		const policyId = await insertPolicy();
		const project = await createTeamProject();
		await assignPolicyToProject(policyId, project.id);
		await groupAssignments.insert({ policyId, group: 'newProjects' });

		await policies.delete({ id: policyId });

		expect(await countRows(policyId)).toEqual({ policies: 0, projects: 0, groups: 0 });
	});
});
