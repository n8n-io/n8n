import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { Project, Role } from '../../entities';
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

	describe('scope lookups', () => {
		it('finds one project for a user with one of the required roles', async () => {
			const project = { id: 'project-1' } as Project;
			entityManager.findOne.mockResolvedValueOnce(project);

			const result = await projectRepository.findByIdForUserWithRoles('project-1', 'user-1', [
				'project:viewer',
			]);

			expect(entityManager.findOne).toHaveBeenCalledWith(Project, {
				where: {
					id: 'project-1',
					projectRelations: { userId: 'user-1', role: In(['project:viewer']) },
				},
			});
			expect(result).toBe(project);
		});

		it('loads role scopes through the operation context', async () => {
			const roles = [{ slug: 'project:viewer' }] as Role[];
			entityManager.find.mockResolvedValueOnce(roles);

			await expect(projectRepository.loadRolesForProjectScopeCheck({})).resolves.toBe(roles);
			expect(entityManager.find).toHaveBeenCalledWith(Role, { relations: ['scopes'] });
		});

		it('finds project ids without an input id filter', async () => {
			entityManager.find.mockResolvedValueOnce([{ id: 'project-1' }]);

			const result = await projectRepository.findIdsForUserWithRoles({
				userId: 'user-1',
				projectRoles: ['project:viewer'],
				restrictToTeamProjects: true,
			});

			expect(entityManager.find).toHaveBeenCalledWith(Project, {
				where: {
					type: 'team',
					projectRelations: { userId: 'user-1', role: In(['project:viewer']) },
				},
				select: ['id'],
			});
			expect(result).toEqual(['project-1']);
		});
	});

	describe('project list operations', () => {
		it('uses stable ordering for project pages', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await projectRepository.findPage({ offset: 20, limit: 10 });

			expect(entityManager.findAndCount).toHaveBeenCalledWith(Project, {
				skip: 20,
				take: 10,
				order: { createdAt: 'ASC', id: 'ASC' },
			});
		});

		it('reports whether a team project was updated', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, raw: {}, generatedMaps: [] });

			await expect(
				projectRepository.updateTeamProject('project-1', { name: 'Updated' }),
			).resolves.toBe(true);
			expect(entityManager.update).toHaveBeenCalledWith(
				Project,
				{ id: 'project-1', type: 'team' },
				{ name: 'Updated' },
			);
		});
	});
});
