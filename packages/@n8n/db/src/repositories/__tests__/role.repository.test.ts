import { Container } from '@n8n/di';

import { Person, ProjectRelation, ServiceAccount, ServiceAccountDetails } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { RoleRepository } from '../role.repository';

describe('RoleRepository', () => {
	const entityManager = mockEntityManager(ProjectRelation);
	const roleRepository = Container.get(RoleRepository);

	beforeEach(() => {
		entityManager.find.mockReset();
	});

	describe('findAllProjectMembers', () => {
		const person = Object.assign(new Person(), {
			id: 'person-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
		});
		const serviceAccount = Object.assign(new ServiceAccount(), {
			id: 'service-1',
			details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
		});

		it('loads the members without the role and its eager scopes', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await roleRepository.findAllProjectMembers('project-1', 'project:editor');

			expect(entityManager.find).toHaveBeenCalledWith(ProjectRelation, {
				where: { projectId: 'project-1', role: { slug: 'project:editor' } },
				relations: { user: true },
			});
		});

		it('builds an entry with the kind for a person and for a service account', async () => {
			entityManager.find.mockResolvedValueOnce([{ user: person }, { user: serviceAccount }]);

			const members = await roleRepository.findAllProjectMembers('project-1', 'project:editor');

			expect(members).toEqual([
				{
					userId: 'person-1',
					firstName: 'Ada',
					lastName: 'Lovelace',
					email: 'ada@example.com',
					role: 'project:editor',
					kind: 'person',
				},
				{
					userId: 'service-1',
					firstName: 'Deploy bot',
					lastName: null,
					email: '',
					role: 'project:editor',
					kind: 'service',
				},
			]);
		});

		it('sends an empty email for a person without one', async () => {
			const personWithoutEmail = Object.assign(new Person(), {
				id: 'person-2',
				email: null,
				firstName: null,
				lastName: null,
			});
			entityManager.find.mockResolvedValueOnce([{ user: personWithoutEmail }]);

			const members = await roleRepository.findAllProjectMembers('project-1', 'project:editor');

			expect(members).toEqual([
				{
					userId: 'person-2',
					firstName: null,
					lastName: null,
					email: '',
					role: 'project:editor',
					kind: 'person',
				},
			]);
		});
	});
});
