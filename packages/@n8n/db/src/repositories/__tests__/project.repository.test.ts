import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { Project } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ProjectRepository } from '../project.repository';

describe('ProjectRepository', () => {
	const entityManager = mockEntityManager(Project);
	const projectRepository = Container.get(ProjectRepository);

	beforeEach(() => {
		vi.resetAllMocks();
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

	describe('findByIdsForUserWithRoles', () => {
		it('batches large project id lists', async () => {
			const projectIds = Array.from({ length: 10_001 }, (_, index) => `project-${index}`);
			const createdAt = new Date('2026-01-01');
			const uppercase = { id: 'project-A', createdAt } as Project;
			const lowercase = { id: 'project-a', createdAt } as Project;
			entityManager.find.mockResolvedValueOnce([lowercase]).mockResolvedValueOnce([uppercase]);

			const result = await projectRepository.findByIdsForUserWithRoles(projectIds);

			expect(entityManager.find).toHaveBeenCalledTimes(2);
			expect(entityManager.find).toHaveBeenNthCalledWith(1, Project, {
				where: { id: In(projectIds.slice(0, 10_000)) },
			});
			expect(entityManager.find).toHaveBeenNthCalledWith(2, Project, {
				where: { id: In(projectIds.slice(10_000)) },
			});
			expect(result).toEqual([uppercase, lowercase]);
		});
	});
});
