import type { ProjectRelation } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
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

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { CacheService } from '../cache/cache.service';
import { ProjectService } from '../project.service.ee';
import type { RoleService } from '../role.service';

describe('ProjectService', () => {
	const manager = mock<EntityManager>();
	const projectRepository = mock<ProjectRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>({ manager });
	const roleService = mock<RoleService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const cacheService = mock<CacheService>();
	const moduleRegistry = mock<ModuleRegistry>({ entities: [] });
	const projectService = new ProjectService(
		mock(),
		projectRepository,
		projectRelationRepository,
		roleService,
		sharedCredentialsRepository,
		cacheService,
		mock(),
		mock<DatabaseConfig>({ type: 'postgresdb' }),
		moduleRegistry,
	);

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
			expect(cacheService.deleteMany).toHaveBeenCalledWith([
				'credential-can-use-secrets:cred1',
				'credential-can-use-secrets:cred2',
			]);
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

	describe('getProjectForCredentialCreation', () => {
		const mockUser = mock<any>({
			id: 'user1',
			role: {
				scopes: [],
			},
		});
		const mockTransactionManager = mock<EntityManager>();

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should return personal project when projectId is undefined', async () => {
			// ARRANGE
			const mockProject = mock<Project>({ id: 'personal-project-1', type: 'personal' });
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValueOnce(mockProject);

			// ACT
			const result = await projectService.getProjectForCredentialCreation(
				mockUser,
				undefined,
				mockTransactionManager,
			);

			// ASSERT
			expect(result).toBe(mockProject);
			expect(projectRepository.getPersonalProjectForUserOrFail).toHaveBeenCalledWith(
				mockUser.id,
				mockTransactionManager,
			);
		});

		it('should return project with scope when projectId is specified and user has permission', async () => {
			// ARRANGE
			const projectId = 'team-project-1';
			const mockProject = mock<Project>({ id: projectId, type: 'team' });
			jest.spyOn(projectService, 'getProjectWithScope').mockResolvedValueOnce(mockProject);

			// ACT
			const result = await projectService.getProjectForCredentialCreation(
				mockUser,
				projectId,
				mockTransactionManager,
			);

			// ASSERT
			expect(result).toBe(mockProject);
			expect(projectService.getProjectWithScope).toHaveBeenCalledWith(
				mockUser,
				projectId,
				['credential:create'],
				mockTransactionManager,
			);
		});

		it('should throw ForbiddenError when projectId is specified but user lacks permission', async () => {
			// ARRANGE
			const projectId = 'team-project-1';
			const spy = jest.spyOn(projectService, 'getProjectWithScope').mockResolvedValue(null);

			// ACT & ASSERT
			const error = await projectService
				.getProjectForCredentialCreation(mockUser, projectId, mockTransactionManager)
				.catch((e) => e);

			expect(error).toBeInstanceOf(ForbiddenError);
			expect(error.message).toBe(
				"You don't have the permissions to save the credential in this project.",
			);

			spy.mockRestore();
		});

		it('should throw NotFoundError when getProjectWithScope returns null for undefined projectId', async () => {
			// ARRANGE
			// Mock to simulate the case where somehow the personal project fetch returns null
			// This tests the safeguard in the code
			const spy = jest
				.spyOn(projectRepository, 'getPersonalProjectForUserOrFail')
				.mockResolvedValue(null as any);

			// ACT & ASSERT
			const error = await projectService
				.getProjectForCredentialCreation(mockUser, undefined, mockTransactionManager)
				.catch((e) => e);

			expect(error).toBeInstanceOf(NotFoundError);
			expect(error.message).toBe('No personal project found');

			spy.mockRestore();
		});

		it('should pass undefined transaction manager if not provided', async () => {
			// ARRANGE
			const mockProject = mock<Project>({ id: 'personal-project-1', type: 'personal' });
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValueOnce(mockProject);

			// ACT
			const result = await projectService.getProjectForCredentialCreation(mockUser, undefined);

			// ASSERT
			expect(result).toBe(mockProject);
			expect(projectRepository.getPersonalProjectForUserOrFail).toHaveBeenCalledWith(
				mockUser.id,
				undefined,
			);
		});
	});
});
