import { Container } from '@n8n/di';
import { In, type EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { Project } from '../../entities';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ProjectRepository } from '../project.repository';

describe('ProjectRepository', () => {
	const entityManager = mockEntityManager(Project);
	const projectRepository = Container.get(ProjectRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('findOneWithUserRoles', () => {
		it.each([undefined, ['project:admin']])(
			'uses the transaction manager with roles %j',
			async (roleSlugs) => {
				const transactionManager = mock<EntityManager>();
				const ctx = { trx: new TypeOrmTransaction(transactionManager) };
				const project = mock<Project>();
				transactionManager.findOne.mockResolvedValueOnce(project);

				expect(
					await projectRepository.findOneWithUserRoles('project-1', 'user-1', roleSlugs, ctx),
				).toBe(project);
				expect(transactionManager.findOne).toHaveBeenCalledWith(Project, {
					where: {
						id: 'project-1',
						...(roleSlugs !== undefined && {
							projectRelations: { userId: 'user-1', role: { slug: In(roleSlugs) } },
						}),
					},
				});
				expect(entityManager.findOne).not.toHaveBeenCalled();
			},
		);
	});

	describe('deleteByIds', () => {
		it('does not query when there are no ids', async () => {
			await projectRepository.deleteByIds([]);

			expect(entityManager.delete).not.toHaveBeenCalled();
		});

		it('deletes every project with a matching id', async () => {
			await projectRepository.deleteByIds(['proj-1', 'proj-2']);

			expect(entityManager.delete).toHaveBeenCalledWith(Project, {
				id: In(['proj-1', 'proj-2']),
			});
		});
	});
});
