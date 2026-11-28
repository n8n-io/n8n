import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import { ExecutionLimitPolicyGroupAssignment } from '../execution-limit-policy-group-assignment.entity';
import { ExecutionLimitPolicyRepository } from '../execution-limit-policy.repository';
import { assignPolicyToProject, insertPolicy } from './policy-rows';

describe('ExecutionLimitPolicyRepository', () => {
	let repository: ExecutionLimitPolicyRepository;

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		repository = Container.get(ExecutionLimitPolicyRepository);
	});

	beforeEach(async () => {
		await Container.get(DataSource).getRepository(ExecutionLimitPolicy).delete({});
		await testDb.truncate(['Project']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findProjectLimits', () => {
		it('returns an empty list when no policy is assigned', async () => {
			expect(await repository.findProjectLimits({})).toEqual([]);
		});

		it('gives the maximum of one policy to each project that has it', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const policyId = await insertPolicy({ maxExecutions: 40 });
			await assignPolicyToProject(policyId, first.id);
			await assignPolicyToProject(policyId, second.id);

			const limits = await repository.findProjectLimits({});

			expect(limits).toHaveLength(2);
			expect(limits).toEqual(
				expect.arrayContaining([
					{ projectId: first.id, maxExecutions: 40 },
					{ projectId: second.id, maxExecutions: 40 },
				]),
			);
		});

		it('gives the lowest maximum to a project with two policies, in one row', async () => {
			const project = await createTeamProject();
			await assignPolicyToProject(await insertPolicy({ maxExecutions: 300 }), project.id);
			await assignPolicyToProject(await insertPolicy({ maxExecutions: 20 }), project.id);

			expect(await repository.findProjectLimits({})).toEqual([
				{ projectId: project.id, maxExecutions: 20 },
			]);
		});

		it('leaves out a policy with no assignment and a policy with a group assignment only', async () => {
			await insertPolicy();
			const groupPolicyId = await insertPolicy();
			await Container.get(DataSource)
				.getRepository(ExecutionLimitPolicyGroupAssignment)
				.insert({ policyId: groupPolicyId, group: 'newProjects' });

			expect(await repository.findProjectLimits({})).toEqual([]);
		});
	});
});
