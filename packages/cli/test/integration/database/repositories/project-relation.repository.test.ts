import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { GLOBAL_AGENT_ROLE, ProjectRelationRepository, ServiceAccountRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember } from '../../shared/db/users';

describe('ProjectRelationRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['ProjectRelation', 'Project', 'User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findProjectRole()', () => {
		it('returns the role of a member of the project', async () => {
			const member = await createMember();
			const team = await createTeamProject();
			await linkUserToProject(member, team, 'project:viewer');

			const role = await Container.get(ProjectRelationRepository).findProjectRole({
				userId: member.id,
				projectId: team.id,
			});

			expect(role?.slug).toBe('project:viewer');
		});

		it('returns null for a user outside the project', async () => {
			const outsider = await createMember();
			const team = await createTeamProject();

			await expect(
				Container.get(ProjectRelationRepository).findProjectRole({
					userId: outsider.id,
					projectId: team.id,
				}),
			).resolves.toBeNull();
		});
	});

	describe('countPeopleByRole()', () => {
		it('counts the project roles of people only', async () => {
			const person = await createMember();
			await createMember();
			const serviceAccounts = Container.get(ServiceAccountRepository);
			const accounts = [];
			for (const name of ['Agent 1', 'Agent 2', 'Agent 3']) {
				const { serviceAccount } = await serviceAccounts.createWithPersonalProject({
					name,
					role: GLOBAL_AGENT_ROLE,
				});
				accounts.push(serviceAccount);
			}
			const team = await createTeamProject();
			await linkUserToProject(person, team, 'project:editor');
			await linkUserToProject(accounts[0], team, 'project:editor');
			await linkUserToProject(accounts[1], team, 'project:viewer');

			await expect(Container.get(ProjectRelationRepository).countPeopleByRole()).resolves.toEqual({
				'project:personalOwner': 2,
				'project:editor': 1,
			});
		});
	});
});
