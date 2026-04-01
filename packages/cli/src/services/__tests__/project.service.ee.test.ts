import type { ProjectRelation } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import {
	type Project,
	type ProjectRepository,
	type SharedCredentialsRepository,
	type ProjectRelationRepository,
	type SharedCredentials,
	PROJECT_ADMIN_ROLE,
} from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { ProjectService } from '../project.service.ee';
import type { RoleService } from '../role.service';

describe('ProjectService', () => {
	const manager = mock<EntityManager>();
	const projectRepository = mock<ProjectRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>({ manager });
	const roleService = mock<RoleService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const moduleRegistry = mock<ModuleRegistry>({ entities: [] });
	const projectService = new ProjectService(
		mock(),
		projectRepository,
		projectRelationRepository,
		roleService,
		sharedCredentialsRepository,
		mock(),
		moduleRegistry,
	);

	describe('getAccessibleProjectsAndCount', () => {
		const options = { skip: 0, take: 10, search: 'test' };

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should call findAllProjectsAndCount for admin users', async () => {
			const adminUser = {
				id: 'admin-user',
				role: { scopes: [{ slug: 'project:read' }] },
			} as any;

			const expected: [Project[], number] = [[mock<Project>({ id: 'p1', name: 'Project 1' })], 1];
			projectRepository.findAllProjectsAndCount.mockResolvedValueOnce(expected);

			const result = await projectService.getAccessibleProjectsAndCount(adminUser, options);

			expect(projectRepository.findAllProjectsAndCount).toHaveBeenCalledWith(options);
			expect(result).toEqual(expected);
		});

		it('should call getAccessibleProjectsAndCount for non-admin users', async () => {
			const memberUser = {
				id: 'member-user',
				role: { scopes: [] },
			} as any;

			const expected: [Project[], number] = [[mock<Project>({ id: 'p2', name: 'Project 2' })], 1];
			projectRepository.getAccessibleProjectsAndCount.mockResolvedValueOnce(expected);

			const result = await projectService.getAccessibleProjectsAndCount(memberUser, options);

			expect(projectRepository.getAccessibleProjectsAndCount).toHaveBeenCalledWith(
				'member-user',
				options,
			);
			expect(result).toEqual(expected);
		});
	});

	describe('addUsersToProject', () => {
		it('throws if called with a personal project', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({ type: 'personal', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);

			// ACT & ASSERT
			await expect(
				projectService.addUsersToProject(projectId, [{ userId: '1234', role: 'project:admin' }]),
			).rejects.toThrowError("Can't add users to personal projects.");
		});

		it('throws if trying to add a personalOwner to a team project', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({ type: 'team', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);

			// ACT & ASSERT
			await expect(
				projectService.addUsersToProject(projectId, [
					{ userId: '1234', role: PROJECT_OWNER_ROLE_SLUG },
				]),
			).rejects.toThrowError("Can't add a personalOwner to a team project.");
		});
	});

	describe('syncProjectRelations', () => {
		const projectId = '12345';
		const mockRelations: ProjectRelation[] = [
			{ userId: 'user1', role: 'project:admin' },
			{ userId: 'user2', role: 'project:viewer' },
		];

		beforeEach(() => {
			jest.clearAllMocks();
			manager.transaction.mockImplementation(async (arg1: unknown, arg2?: unknown) => {
				const runInTransaction = (arg2 ?? arg1) as (
					entityManager: EntityManager,
				) => Promise<unknown>;
				return await runInTransaction(manager);
			});
		});

		it('should successfully sync project relations', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: [],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);

			sharedCredentialsRepository.find.mockResolvedValueOnce([
				mock<SharedCredentials>({ credentialsId: 'cred1' }),
				mock<SharedCredentials>({ credentialsId: 'cred2' }),
			]);

			await projectService.syncProjectRelations(projectId, mockRelations);

			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: { role: true } },
			});

			expect(manager.delete).toHaveBeenCalled();
			expect(manager.insert).toHaveBeenCalled();
		});

		it('should throw error if project not found', async () => {
			projectRepository.findOne.mockResolvedValueOnce(null);

			await expect(projectService.syncProjectRelations(projectId, mockRelations)).rejects.toThrow(
				`Could not find project with ID: ${projectId}`,
			);
		});

		it('should throw error if unlicensed role is used', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: [],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(false);

			await expect(projectService.syncProjectRelations(projectId, mockRelations)).rejects.toThrow(
				'Your instance is not licensed to use role "project:admin"',
			);
		});

		it('should not throw error for existing role even if unlicensed', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: [{ userId: 'user1', role: PROJECT_ADMIN_ROLE }],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(false);

			sharedCredentialsRepository.find.mockResolvedValueOnce([]);

			await expect(
				projectService.syncProjectRelations(projectId, [
					{ userId: 'user1', role: 'project:admin' },
				]),
			).resolves.not.toThrow();
		});
	});

	describe('changeUserRoleInProject', () => {
		const projectId = '12345';
		const mockRelations = [
			{ userId: 'user1', role: { slug: 'project:admin' } },
			{ userId: 'user2', role: { slug: 'project:viewer' } },
		];

		beforeEach(() => {
			jest.clearAllMocks();
			manager.transaction.mockImplementation(async (arg1: unknown, arg2?: unknown) => {
				const runInTransaction = (arg2 ?? arg1) as (
					entityManager: EntityManager,
				) => Promise<unknown>;
				return await runInTransaction(manager);
			});
		});

		it('should successfully change the user role in the project', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: mockRelations,
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);

			await projectService.changeUserRoleInProject(projectId, 'user2', 'project:admin');

			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: { role: true } },
			});

			expect(projectRelationRepository.update).toHaveBeenCalledWith(
				{ projectId, userId: 'user2' },
				{ role: { slug: 'project:admin' } },
			);
		});

		it('should throw if the user is not part of the project', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: mockRelations,
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);

			await expect(
				projectService.changeUserRoleInProject(projectId, 'user3', 'project:admin'),
			).rejects.toThrow(`Could not find project with ID: ${projectId}`);

			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: { role: true } },
			});
		});

		it('should throw if the role to be set is `project:personalOwner`', async () => {
			await expect(
				projectService.changeUserRoleInProject(projectId, 'user2', PROJECT_OWNER_ROLE_SLUG),
			).rejects.toThrow('Personal owner cannot be added to a team project.');
		});

		it('should throw if the project is not a team project', async () => {
			projectRepository.findOne.mockResolvedValueOnce(null);
			roleService.isRoleLicensed.mockReturnValue(true);

			await expect(
				projectService.changeUserRoleInProject(projectId, 'user2', 'project:admin'),
			).rejects.toThrow(`Could not find project with ID: ${projectId}`);

			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: { role: true } },
			});
		});
	});
});
