import type { ProjectRelation } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import {
	type Project,
	type ProjectRepository,
	type SharedCredentialsRepository,
	type SharedWorkflowRepository,
	type ProjectRelationRepository,
	type SharedCredentials,
	ProjectRelation as ProjectRelationEntity,
	PROJECT_ADMIN_ROLE,
	PROJECT_VIEWER_ROLE,
} from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { ICredentialConnectionStatusProvider } from '@/credentials/credential-connection-status-provider.interface';
import type { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import type { OwnershipService } from '../ownership.service';

import { ProjectService } from '../project.service.ee';
import type { RoleService } from '../role.service';

describe('ProjectService', () => {
	const manager = mock<EntityManager>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectRepository = mock<ProjectRepository>({ manager });
	const projectRelationRepository = mock<ProjectRelationRepository>({ manager });
	const roleService = mock<RoleService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const moduleRegistry = mock<ModuleRegistry>({ entities: [] });
	const agentRepository = mock<AgentRepository>();
	const agentKnowledgeService = mock<AgentKnowledgeService>();
	const ownershipService = mock<OwnershipService>();
	const projectService = new ProjectService(
		sharedWorkflowRepository,
		projectRepository,
		projectRelationRepository,
		roleService,
		sharedCredentialsRepository,
		mock(),
		moduleRegistry,
		ownershipService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getAccessibleProjectsAndCount', () => {
		const options = { skip: 0, take: 10, search: 'test' };

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

		describe('cleanup for orphaned credential entries', () => {
			let mockProxy: jest.Mocked<ICredentialConnectionStatusProvider>;

			beforeEach(() => {
				mockProxy = mock<ICredentialConnectionStatusProvider>();
				Object.defineProperty(projectService, 'connectionStatusProxy', {
					configurable: true,
					get: async () => mockProxy,
				});
			});

			it('calls cleanupOrphanedEntriesForUsers with the IDs of removed members', async () => {
				// ARRANGE — project has two members; incoming relations keep only user1
				projectRepository.findOne.mockResolvedValueOnce(
					mock<Project>({
						id: projectId,
						type: 'team',
						projectRelations: [
							{ userId: 'user1', role: PROJECT_ADMIN_ROLE },
							{ userId: 'user2', role: PROJECT_VIEWER_ROLE },
						],
					}),
				);
				roleService.isRoleLicensed.mockReturnValue(true);

				// ACT
				await projectService.syncProjectRelations(projectId, [
					{ userId: 'user1', role: 'project:admin' },
				]);

				// ASSERT — user2 was removed → cleanup must run for user2
				expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(['user2'], manager);
			});

			it('calls cleanupOrphanedEntriesForUsers with union of removed and role-changed IDs', async () => {
				// ARRANGE — user2 removed, user3 role changed
				projectRepository.findOne.mockResolvedValueOnce(
					mock<Project>({
						id: projectId,
						type: 'team',
						projectRelations: [
							{ userId: 'user1', role: PROJECT_ADMIN_ROLE },
							{ userId: 'user2', role: PROJECT_VIEWER_ROLE },
							{ userId: 'user3', role: PROJECT_VIEWER_ROLE },
						],
					}),
				);
				roleService.isRoleLicensed.mockReturnValue(true);

				// ACT — user2 dropped, user3 role changed viewer → admin
				await projectService.syncProjectRelations(projectId, [
					{ userId: 'user1', role: 'project:admin' },
					{ userId: 'user3', role: 'project:admin' },
				]);

				// ASSERT — both user2 (removed) and user3 (role changed) are in the set
				expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(
					expect.arrayContaining(['user2', 'user3']),
					manager,
				);
				const [affectedIds] = mockProxy.cleanupOrphanedEntriesForUsers.mock.calls[0] as [
					string[],
					EntityManager,
				];
				expect(affectedIds).toHaveLength(2);
			});

			it('does not call cleanupOrphanedEntriesForUsers when no members are affected', async () => {
				// ARRANGE — incoming relations are identical to current ones
				projectRepository.findOne.mockResolvedValueOnce(
					mock<Project>({
						id: projectId,
						type: 'team',
						projectRelations: [
							{ userId: 'user1', role: PROJECT_ADMIN_ROLE },
							{ userId: 'user2', role: PROJECT_VIEWER_ROLE },
						],
					}),
				);
				roleService.isRoleLicensed.mockReturnValue(true);

				// ACT — no changes; same users, same roles
				await projectService.syncProjectRelations(projectId, [
					{ userId: 'user1', role: 'project:admin' },
					{ userId: 'user2', role: 'project:viewer' },
				]);

				// ASSERT — no affected users → cleanup must not be called
				expect(mockProxy.cleanupOrphanedEntriesForUsers).not.toHaveBeenCalled();
			});
		});
	});

	describe('deleteUserFromProject', () => {
		let mockProxy: jest.Mocked<ICredentialConnectionStatusProvider>;

		beforeEach(() => {
			mockProxy = mock<ICredentialConnectionStatusProvider>();
			Object.defineProperty(projectService, 'connectionStatusProxy', {
				configurable: true,
				get: async () => mockProxy,
			});
			manager.transaction.mockImplementation(async (arg1: unknown, arg2?: unknown) => {
				const runInTransaction = (arg2 ?? arg1) as (
					entityManager: EntityManager,
				) => Promise<unknown>;
				return await runInTransaction(manager);
			});
		});

		it('calls cleanupOrphanedEntriesForUsers with the removed userId', async () => {
			// ARRANGE
			const projectId = 'proj-1';
			const userId = 'user-to-remove';
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: [
						{ userId, role: PROJECT_VIEWER_ROLE },
						{ userId: 'owner', role: PROJECT_ADMIN_ROLE },
					],
				}),
			);

			// ACT
			await projectService.deleteUserFromProject(projectId, userId);

			// ASSERT — member removed → cleanup must run inside the same transaction
			expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith([userId], manager);
		});

		it('throws when trying to remove the project owner', async () => {
			// ARRANGE
			const projectId = 'proj-1';
			const ownerId = 'owner-user';
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: [
						{ userId: ownerId, role: { ...PROJECT_ADMIN_ROLE, slug: PROJECT_OWNER_ROLE_SLUG } },
					],
				}),
			);

			// ACT & ASSERT
			await expect(projectService.deleteUserFromProject(projectId, ownerId)).rejects.toThrow(
				'Project owner cannot be removed from the project',
			);
			expect(mockProxy.cleanupOrphanedEntriesForUsers).not.toHaveBeenCalled();
		});
	});

	describe('updateProject', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			ownershipService.invalidateWorkflowProjectCacheForProject.mockResolvedValue(undefined);
		});

		it('should trim whitespace from tag keys on save', async () => {
			projectRepository.update.mockResolvedValueOnce({ affected: 1 } as never);

			await projectService.updateProject('proj-1', {
				name: 'My Project',
				customTelemetryTags: [
					{ key: '  env  ', value: 'production' },
					{ key: 'team ', value: 'backend' },
				],
			});

			expect(projectRepository.update).toHaveBeenCalledWith(
				{ id: 'proj-1', type: 'team' },
				expect.objectContaining({
					customTelemetryTags: [
						{ key: 'env', value: 'production' },
						{ key: 'team', value: 'backend' },
					],
				}),
			);
		});

		it('should filter out tags with empty keys after trimming', async () => {
			projectRepository.update.mockResolvedValueOnce({ affected: 1 } as never);

			await projectService.updateProject('proj-1', {
				name: 'My Project',
				customTelemetryTags: [
					{ key: '   ', value: 'ignored' },
					{ key: 'region', value: 'us-east' },
				],
			});

			expect(projectRepository.update).toHaveBeenCalledWith(
				{ id: 'proj-1', type: 'team' },
				expect.objectContaining({
					customTelemetryTags: [{ key: 'region', value: 'us-east' }],
				}),
			);
		});

		it('should save undefined customTelemetryTags when not provided', async () => {
			projectRepository.update.mockResolvedValueOnce({ affected: 1 } as never);

			await projectService.updateProject('proj-1', { name: 'My Project' });

			expect(projectRepository.update).toHaveBeenCalledWith(
				{ id: 'proj-1', type: 'team' },
				expect.objectContaining({ customTelemetryTags: undefined }),
			);
		});

		it('should invalidate workflow project cache after a successful update', async () => {
			projectRepository.update.mockResolvedValueOnce({ affected: 1 } as never);

			await projectService.updateProject('proj-1', { name: 'Updated' });

			expect(ownershipService.invalidateWorkflowProjectCacheForProject).toHaveBeenCalledWith(
				'proj-1',
			);
		});

		it('should throw NotFoundError when project is not found', async () => {
			projectRepository.update.mockResolvedValueOnce({ affected: 0 } as never);

			await expect(projectService.updateProject('missing-proj', { name: 'Ghost' })).rejects.toThrow(
				'Could not find project with ID: missing-proj',
			);
		});
	});

	describe('changeUserRoleInProject', () => {
		const projectId = '12345';
		const mockRelations = [
			{ userId: 'user1', role: { slug: 'project:admin' } },
			{ userId: 'user2', role: { slug: 'project:viewer' } },
		];

		let mockProxy: jest.Mocked<ICredentialConnectionStatusProvider>;

		beforeEach(() => {
			mockProxy = mock<ICredentialConnectionStatusProvider>();
			Object.defineProperty(projectService, 'connectionStatusProxy', {
				configurable: true,
				get: async () => mockProxy,
			});
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

			expect(manager.update).toHaveBeenCalledWith(
				ProjectRelationEntity,
				{ projectId, userId: 'user2' },
				{ role: { slug: 'project:admin' } },
			);
			expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(['user2'], manager);
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

	describe('deleteProject', () => {
		const user = { id: 'user-1', role: { scopes: [{ slug: 'project:delete' }] } } as any;

		beforeEach(() => {
			Object.defineProperty(projectService, 'workflowService', {
				configurable: true,
				get: async () => ({ delete: jest.fn() }),
			});
			Object.defineProperty(projectService, 'credentialsService', {
				configurable: true,
				get: async () => ({ delete: jest.fn() }),
			});
		});

		it('calls cleanupOrphanedEntriesForUsers with member IDs after project is deleted', async () => {
			// ARRANGE
			const project = mock<Project>({ id: 'project-1', type: 'team' });
			const mockProxy = mock<ICredentialConnectionStatusProvider>();
			Object.defineProperty(projectService, 'connectionStatusProxy', {
				configurable: true,
				get: async () => mockProxy,
			});
			manager.findOne.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockReturnValue(false);
			// Two members in the project
			projectRelationRepository.findBy.mockResolvedValueOnce([
				{ userId: 'member-1' },
				{ userId: 'member-2' },
			] as never);

			// ACT
			await projectService.deleteProject(user, project.id);

			// ASSERT — project removed first, then cleanup for former members
			expect(projectRepository.remove).toHaveBeenCalledWith(project);
			expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith([
				'member-1',
				'member-2',
			]);
			expect(projectRepository.remove.mock.invocationCallOrder[0]).toBeLessThan(
				mockProxy.cleanupOrphanedEntriesForUsers.mock.invocationCallOrder[0],
			);
		});

		it('skips credential cleanup when the project had no members', async () => {
			// ARRANGE
			const project = mock<Project>({ id: 'project-1', type: 'team' });
			const mockProxy = mock<ICredentialConnectionStatusProvider>();
			Object.defineProperty(projectService, 'connectionStatusProxy', {
				configurable: true,
				get: async () => mockProxy,
			});
			manager.findOne.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockReturnValue(false);
			projectRelationRepository.findBy.mockResolvedValueOnce([]);

			// ACT
			await projectService.deleteProject(user, project.id);

			// ASSERT — no members → cleanup must not be called
			expect(projectRepository.remove).toHaveBeenCalledWith(project);
			expect(mockProxy.cleanupOrphanedEntriesForUsers).not.toHaveBeenCalled();
		});

		it('cleans agent knowledge files before project deletion cascades agent files', async () => {
			const project = mock<Project>({ id: 'project-1', type: 'team' });
			Object.defineProperty(projectService, 'agentRepository', {
				configurable: true,
				get: async () => agentRepository,
			});
			Object.defineProperty(projectService, 'agentKnowledgeService', {
				configurable: true,
				get: async () => agentKnowledgeService,
			});
			manager.findOne.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockImplementation((moduleName) => moduleName === 'agents');
			projectRelationRepository.findBy.mockResolvedValueOnce([]);
			agentRepository.findByProjectId.mockResolvedValueOnce([
				{ id: 'agent-1' },
				{ id: 'agent-2' },
			] as never);

			await projectService.deleteProject(user, project.id);

			expect(agentRepository.findByProjectId).toHaveBeenCalledWith(project.id);
			expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith('agent-1');
			expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith('agent-2');
			expect(agentKnowledgeService.deleteAllFilesForAgent.mock.invocationCallOrder[1]).toBeLessThan(
				projectRepository.remove.mock.invocationCallOrder[0],
			);
		});

		it('skips agent knowledge cleanup when the agents module is inactive', async () => {
			const project = mock<Project>({ id: 'project-1', type: 'team' });
			manager.findOne.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockReturnValue(false);
			projectRelationRepository.findBy.mockResolvedValueOnce([]);

			await projectService.deleteProject(user, project.id);

			expect(agentRepository.findByProjectId).not.toHaveBeenCalled();
			expect(agentKnowledgeService.deleteAllFilesForAgent).not.toHaveBeenCalled();
			expect(projectRepository.remove).toHaveBeenCalledWith(project);
		});
	});
});
