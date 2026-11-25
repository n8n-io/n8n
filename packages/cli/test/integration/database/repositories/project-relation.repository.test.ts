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
