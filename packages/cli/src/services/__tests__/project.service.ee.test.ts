import type { ProjectRelation } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { type EventService, type RoleService } from '@n8n/backend-services';
import {
	type Project,
	type ProjectRepository,
	type Role,
	type SharedCredentialsRepository,
	type SharedWorkflowRepository,
	type ProjectRelationRepository,
	type SharedCredentials,
	type User,
	type UserRepository,
	ProjectRelation as ProjectRelationEntity,
	PROJECT_ADMIN_ROLE,
	PROJECT_VIEWER_ROLE,
	type OperationContext,
	type TransactionRunner,
} from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '../ownership.service';
import { ProjectService } from '../project.service.ee';

import type { ICredentialConnectionStatusProvider } from '@/credentials/credential-connection-status-provider.interface';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import type { AgentChatAttachmentService } from '@/modules/agents/agent-chat-attachment.service';
import type { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import type { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { UserManagementMailer } from '@/user-management/email';

describe('ProjectService', () => {
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectRepository = mock<ProjectRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const roleService = mock<RoleService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const moduleRegistry = mock<ModuleRegistry>({ entities: [] });
	const agentRepository = mock<AgentRepository>();
	const agentKnowledgeService = mock<AgentKnowledgeService>();
	const agentExecutionService = mock<AgentExecutionService>();
	const agentChatAttachmentService = mock<AgentChatAttachmentService>();
	const ownershipService = mock<OwnershipService>();
	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	const userManagementMailer = mock<UserManagementMailer>();
	const userRepository = mock<UserRepository>();
	const transactionRunner = mock<TransactionRunner>();
	const transactionContext: OperationContext = {};
	const user = mock<User>({ id: 'actor-user', role: mock({ slug: 'global:owner' }) });
	const projectService = new ProjectService(
		sharedWorkflowRepository,
		projectRepository,
		projectRelationRepository,
		roleService,
		sharedCredentialsRepository,
		mock(), // folderRepository
		mock(), // licenseState
		moduleRegistry,
		ownershipService,
		logger,
		eventService,
		userManagementMailer,
		userRepository,
		transactionRunner,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		projectRelationRepository.find.mockResolvedValue([]);
		projectRelationRepository.findWithUserAndRole.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([]);
		transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(transactionContext));
	});

	const instanceUser = (id: string, slug: string, disabled = false) =>
		mock<User>({ id, disabled, role: mock({ slug }) });

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
			expect(result).toEqual({ projects: expected[0], count: expected[1] });
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
			expect(result).toEqual({ projects: expected[0], count: expected[1] });
		});
	});

	describe('getProjectsAndCount', () => {
		it('delegates the requested page bounds to the repository', async () => {
			projectRepository.findPage.mockResolvedValueOnce([[], 0]);

			await projectService.getProjectsAndCount({ offset: 20, limit: 10 });

			expect(projectRepository.findPage).toHaveBeenCalledWith({
				offset: 20,
				limit: 10,
			});
		});
	});

	describe('addUsersToProject', () => {
		it('throws if called with a personal project', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({ type: 'personal', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);

			// ACT & ASSERT
			await expect(
				projectService.addUsersToProject(user, projectId, [
					{ userId: '1234', role: 'project:admin' },
				]),
			).rejects.toThrowError("Can't add users to personal projects.");
		});

		it('throws if trying to add a personalOwner to a team project', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({ type: 'team', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);

			// ACT & ASSERT
			await expect(
				projectService.addUsersToProject(user, projectId, [
					{ userId: '1234', role: PROJECT_OWNER_ROLE_SLUG },
				]),
			).rejects.toThrowError("Can't add a personalOwner to a team project.");
		});

		it('notifies only the newly added users, not existing members', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					name: 'Team Project',
					type: 'team',
					// `existing` is already a member; `newcomer` is not.
					projectRelations: [mock<ProjectRelationEntity>({ userId: 'existing' })],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);

			// ACT
			await projectService.addUsersToProject(user, projectId, [
				{ userId: 'existing', role: 'project:admin' },
				{ userId: 'newcomer', role: 'project:viewer' },
			]);

			// ASSERT: mailer called once, only for the newcomer
			expect(userManagementMailer.notifyProjectShared).toHaveBeenCalledTimes(1);
			expect(userManagementMailer.notifyProjectShared).toHaveBeenCalledWith({
				sharer: user,
				newSharees: [{ userId: 'newcomer', role: 'project:viewer' }],
				project: { id: projectId, name: 'Team Project' },
			});
		});

		it('skips instance owners and admins and saves the rest', async () => {
			const projectId = '12345';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({ id: projectId, name: 'Team Project', type: 'team', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			userRepository.findManyByIds.mockResolvedValueOnce([
				instanceUser('admin', 'global:admin'),
				instanceUser('member', 'global:member'),
			]);

			await projectService.addUsersToProject(user, projectId, [
				{ userId: 'admin', role: 'project:viewer' },
				{ userId: 'member', role: 'project:viewer' },
			]);

			expect(projectRelationRepository.saveProjectMembers).toHaveBeenCalledWith(projectId, [
				{ userId: 'member', role: 'project:viewer' },
			]);
			expect(userManagementMailer.notifyProjectShared).toHaveBeenCalledTimes(1);
			expect(userManagementMailer.notifyProjectShared).toHaveBeenCalledWith({
				sharer: user,
				newSharees: [{ userId: 'member', role: 'project:viewer' }],
				project: { id: projectId, name: 'Team Project' },
			});
		});

		it('does not notify when no users are new', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					name: 'Team Project',
					type: 'team',
					projectRelations: [mock<ProjectRelationEntity>({ userId: 'existing' })],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);

			// ACT
			await projectService.addUsersToProject(user, projectId, [
				{ userId: 'existing', role: 'project:admin' },
			]);

			// ASSERT
			expect(userManagementMailer.notifyProjectShared).not.toHaveBeenCalled();
		});
	});

	describe('syncProjectRelations', () => {
		const projectId = '12345';
		const mockRelations: ProjectRelation[] = [
			{ userId: 'user1', role: 'project:admin' },
			{ userId: 'user2', role: 'project:viewer' },
		];

		it('should successfully sync project relations', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
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

			expect(projectRepository.findTeamWithRelations).toHaveBeenCalledWith(projectId);

			expect(projectRelationRepository.replaceProjectMembers).toHaveBeenCalledWith(
				projectId,
				mockRelations,
				transactionContext,
			);
		});

		it('should throw error if project not found', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(null);

			await expect(projectService.syncProjectRelations(projectId, mockRelations)).rejects.toThrow(
				`Could not find project with ID: ${projectId}`,
			);
		});

		it('should throw error if unlicensed role is used', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
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
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
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
			let mockProxy: Mocked<ICredentialConnectionStatusProvider>;

			beforeEach(() => {
				mockProxy = mock<ICredentialConnectionStatusProvider>();
				Object.defineProperty(projectService, 'connectionStatusProxy', {
					configurable: true,
					get: async () => mockProxy,
				});
			});

			it('calls cleanupOrphanedEntriesForUsers with the IDs of removed members', async () => {
				// ARRANGE — project has two members; incoming relations keep only user1
				projectRepository.findTeamWithRelations.mockResolvedValueOnce(
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
				expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(
					['user2'],
					transactionContext,
				);
			});

			it('calls cleanupOrphanedEntriesForUsers with union of removed and role-changed IDs', async () => {
				// ARRANGE — user2 removed, user3 role changed
				projectRepository.findTeamWithRelations.mockResolvedValueOnce(
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
					transactionContext,
				);
				const [affectedIds] = mockProxy.cleanupOrphanedEntriesForUsers.mock.calls[0];
				expect(affectedIds).toHaveLength(2);
			});

			it('does not call cleanupOrphanedEntriesForUsers when no members are affected', async () => {
				// ARRANGE — incoming relations are identical to current ones
				projectRepository.findTeamWithRelations.mockResolvedValueOnce(
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

	describe('addUsersWithConflictSemantics', () => {
		it('treats an instance owner as already having access and adds the rest', async () => {
			const projectId = '12345';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({ id: projectId, name: 'Team Project', type: 'team', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			userRepository.findManyByIds.mockResolvedValueOnce([instanceUser('owner', 'global:owner')]);

			const result = await projectService.addUsersWithConflictSemantics(user, projectId, [
				{ userId: 'owner', role: 'project:viewer' },
				{ userId: 'member', role: 'project:viewer' },
			]);

			expect(result.added).toEqual([{ userId: 'member', role: 'project:viewer' }]);
			expect(result.conflicts).toEqual([]);
			expect(projectRelationRepository.insertProjectMembers).toHaveBeenCalledWith(projectId, [
				{ userId: 'member', role: 'project:viewer' },
			]);
		});

		it('does not report a conflict for an instance admin who holds another role', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({
					id: '12345',
					type: 'team',
					projectRelations: [{ userId: 'admin', role: PROJECT_VIEWER_ROLE }],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			userRepository.findManyByIds.mockResolvedValueOnce([instanceUser('admin', 'global:admin')]);

			const result = await projectService.addUsersWithConflictSemantics(user, '12345', [
				{ userId: 'admin', role: 'project:editor' },
			]);

			expect(result).toMatchObject({ added: [], conflicts: [] });
			expect(projectRelationRepository.insertProjectMembers).not.toHaveBeenCalled();
		});

		it('adds a disabled instance admin like any other user', async () => {
			const projectId = '12345';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({ id: projectId, name: 'Team Project', type: 'team', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			userRepository.findManyByIds.mockResolvedValueOnce([
				instanceUser('disabled-admin', 'global:admin', true),
			]);

			const result = await projectService.addUsersWithConflictSemantics(user, projectId, [
				{ userId: 'disabled-admin', role: 'project:editor' },
			]);

			expect(result.added).toEqual([{ userId: 'disabled-admin', role: 'project:editor' }]);
			expect(projectRelationRepository.insertProjectMembers).toHaveBeenCalledWith(projectId, [
				{ userId: 'disabled-admin', role: 'project:editor' },
			]);
		});
	});

	describe('deleteUserFromProject', () => {
		let mockProxy: Mocked<ICredentialConnectionStatusProvider>;

		beforeEach(() => {
			mockProxy = mock<ICredentialConnectionStatusProvider>();
			Object.defineProperty(projectService, 'connectionStatusProxy', {
				configurable: true,
				get: async () => mockProxy,
			});
		});

		it('calls cleanupOrphanedEntriesForUsers with the removed userId', async () => {
			// ARRANGE
			const projectId = 'proj-1';
			const userId = 'user-to-remove';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
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
			await projectService.deleteUserFromProject(user, projectId, userId);

			// ASSERT — member removed → cleanup must run inside the same transaction
			expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(
				[userId],
				transactionContext,
			);
		});

		it('throws when trying to remove the project owner', async () => {
			// ARRANGE
			const projectId = 'proj-1';
			const ownerId = 'owner-user';
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: [
						{ userId: ownerId, role: { ...PROJECT_ADMIN_ROLE, slug: PROJECT_OWNER_ROLE_SLUG } },
					],
				}),
			);

			// ACT & ASSERT
			await expect(projectService.deleteUserFromProject(user, projectId, ownerId)).rejects.toThrow(
				'Project owner cannot be removed from the project',
			);
			expect(mockProxy.cleanupOrphanedEntriesForUsers).not.toHaveBeenCalled();
		});

		it('throws when trying to remove an instance admin', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({
					id: 'proj-1',
					type: 'team',
					projectRelations: [{ userId: 'admin', role: PROJECT_ADMIN_ROLE }],
				}),
			);
			userRepository.findManyByIds.mockResolvedValueOnce([instanceUser('admin', 'global:admin')]);

			await expect(projectService.deleteUserFromProject(user, 'proj-1', 'admin')).rejects.toThrow(
				"This user has access through their instance role and can't be removed from the project.",
			);
			expect(projectRelationRepository.deleteProjectMember).not.toHaveBeenCalled();
		});
	});

	describe('updateProject', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			ownershipService.invalidateWorkflowProjectCacheForProject.mockResolvedValue(undefined);
		});

		it('should trim whitespace from tag keys on save', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(true);

			await projectService.updateProject(user, 'proj-1', {
				name: 'My Project',
				customTelemetryTags: [
					{ key: '  env  ', value: 'production' },
					{ key: 'team ', value: 'backend' },
				],
			});

			expect(projectRepository.updateTeamProject).toHaveBeenCalledWith(
				'proj-1',
				expect.objectContaining({
					customTelemetryTags: [
						{ key: 'env', value: 'production' },
						{ key: 'team', value: 'backend' },
					],
				}),
			);
		});

		it('should filter out tags with empty keys after trimming', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(true);

			await projectService.updateProject(user, 'proj-1', {
				name: 'My Project',
				customTelemetryTags: [
					{ key: '   ', value: 'ignored' },
					{ key: 'region', value: 'us-east' },
				],
			});

			expect(projectRepository.updateTeamProject).toHaveBeenCalledWith(
				'proj-1',
				expect.objectContaining({
					customTelemetryTags: [{ key: 'region', value: 'us-east' }],
				}),
			);
		});

		it('should save undefined customTelemetryTags when not provided', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(true);

			await projectService.updateProject(user, 'proj-1', { name: 'My Project' });

			expect(projectRepository.updateTeamProject).toHaveBeenCalledWith(
				'proj-1',
				expect.objectContaining({ customTelemetryTags: undefined }),
			);
		});

		it('should invalidate workflow project cache after a successful update', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(true);

			await projectService.updateProject(user, 'proj-1', { name: 'Updated' });

			expect(ownershipService.invalidateWorkflowProjectCacheForProject).toHaveBeenCalledWith(
				'proj-1',
			);
		});

		it('should throw NotFoundError when project is not found', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(false);

			await expect(
				projectService.updateProject(user, 'missing-proj', { name: 'Ghost' }),
			).rejects.toThrow('Could not find project with ID: missing-proj');
		});

		it('emits team-project-updated with the otel tag count when tags are provided', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(true);

			await projectService.updateProject(user, 'proj-1', {
				name: 'My Project',
				customTelemetryTags: [
					{ key: 'env', value: 'production' },
					{ key: 'team', value: 'backend' },
				],
			});

			expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
				userId: 'actor-user',
				role: 'global:owner',
				projectId: 'proj-1',
				otelProjectCustomTagsCount: 2,
			});
		});

		it('emits team-project-updated without the otel tag count when tags are omitted', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(true);

			await projectService.updateProject(user, 'proj-1', { name: 'My Project' });

			expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
				userId: 'actor-user',
				role: 'global:owner',
				projectId: 'proj-1',
			});
		});

		it('does not emit when the project is not found', async () => {
			projectRepository.updateTeamProject.mockResolvedValueOnce(false);

			await expect(
				projectService.updateProject(user, 'missing-proj', { name: 'Ghost' }),
			).rejects.toThrow();

			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('changeUserRoleInProject', () => {
		const projectId = '12345';
		const mockRelations = [
			{ userId: 'user1', role: { slug: 'project:admin' } },
			{ userId: 'user2', role: { slug: 'project:viewer' } },
		];

		let mockProxy: Mocked<ICredentialConnectionStatusProvider>;

		beforeEach(() => {
			mockProxy = mock<ICredentialConnectionStatusProvider>();
			Object.defineProperty(projectService, 'connectionStatusProxy', {
				configurable: true,
				get: async () => mockProxy,
			});
		});

		it('throws when trying to change the role of an instance admin', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({ id: projectId, type: 'team', projectRelations: mockRelations }),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			userRepository.findManyByIds.mockResolvedValueOnce([instanceUser('user1', 'global:owner')]);

			await expect(
				projectService.changeUserRoleInProject(user, projectId, 'user1', 'project:viewer'),
			).rejects.toThrow(ForbiddenError);
			expect(projectRelationRepository.updateProjectMemberRole).not.toHaveBeenCalled();
		});

		it('throws a forbidden error for an instance admin with no relation to the project', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({ id: projectId, type: 'team', projectRelations: mockRelations }),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			userRepository.findManyByIds.mockResolvedValueOnce([instanceUser('admin', 'global:admin')]);

			await expect(
				projectService.changeUserRoleInProject(user, projectId, 'admin', 'project:viewer'),
			).rejects.toThrow(ForbiddenError);
			expect(projectRelationRepository.updateProjectMemberRole).not.toHaveBeenCalled();
		});

		it('should successfully change the user role in the project', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: mockRelations,
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			projectRelationRepository.findWithUserAndRole.mockResolvedValue(mockRelations as never);

			await projectService.changeUserRoleInProject(user, projectId, 'user2', 'project:admin');

			expect(projectRepository.findTeamWithRelations).toHaveBeenCalledWith(projectId);

			expect(projectRelationRepository.updateProjectMemberRole).toHaveBeenCalledWith(
				projectId,
				'user2',
				'project:admin',
				transactionContext,
			);
			expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(
				['user2'],
				transactionContext,
			);

			expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
				userId: 'actor-user',
				role: 'global:owner',
				members: [
					{ userId: 'user1', role: 'project:admin' },
					{ userId: 'user2', role: 'project:viewer' },
				],
				projectId,
			});
		});

		it('should throw if the user is not part of the project', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(
				mock<Project>({
					id: projectId,
					type: 'team',
					projectRelations: mockRelations,
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);

			await expect(
				projectService.changeUserRoleInProject(user, projectId, 'user3', 'project:admin'),
			).rejects.toThrow(`Could not find project with ID: ${projectId}`);

			expect(projectRepository.findTeamWithRelations).toHaveBeenCalledWith(projectId);
		});

		it('should throw if the role to be set is `project:personalOwner`', async () => {
			await expect(
				projectService.changeUserRoleInProject(user, projectId, 'user2', PROJECT_OWNER_ROLE_SLUG),
			).rejects.toThrow('Personal owner cannot be added to a team project.');
		});

		it('should throw if the project is not a team project', async () => {
			projectRepository.findTeamWithRelations.mockResolvedValueOnce(null);
			roleService.isRoleLicensed.mockReturnValue(true);

			await expect(
				projectService.changeUserRoleInProject(user, projectId, 'user2', 'project:admin'),
			).rejects.toThrow(`Could not find project with ID: ${projectId}`);

			expect(projectRepository.findTeamWithRelations).toHaveBeenCalledWith(projectId);
		});
	});

	describe('deleteProject', () => {
		const user = {
			id: 'user-1',
			role: { slug: 'global:owner', scopes: [{ slug: 'project:delete' }] },
		} as any;

		beforeEach(() => {
			Object.defineProperty(projectService, 'workflowService', {
				configurable: true,
				get: async () => ({ delete: vi.fn() }),
			});
			Object.defineProperty(projectService, 'credentialsService', {
				configurable: true,
				get: async () => ({ delete: vi.fn() }),
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
			projectRepository.findByIdForUserWithRoles.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockReturnValue(false);
			// Two members in the project
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValueOnce([
				'member-1',
				'member-2',
			]);

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

			expect(eventService.emit).toHaveBeenCalledWith('team-project-deleted', {
				userId: 'user-1',
				role: 'global:owner',
				projectId: project.id,
				removalType: 'delete',
				targetProjectId: undefined,
			});
		});

		it('skips credential cleanup when the project had no members', async () => {
			// ARRANGE
			const project = mock<Project>({ id: 'project-1', type: 'team' });
			const mockProxy = mock<ICredentialConnectionStatusProvider>();
			Object.defineProperty(projectService, 'connectionStatusProxy', {
				configurable: true,
				get: async () => mockProxy,
			});
			projectRepository.findByIdForUserWithRoles.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockReturnValue(false);
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValueOnce([]);

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
			Object.defineProperty(projectService, 'agentExecutionService', {
				configurable: true,
				get: async () => agentExecutionService,
			});
			Object.defineProperty(projectService, 'agentChatAttachmentService', {
				configurable: true,
				get: async () => agentChatAttachmentService,
			});
			projectRepository.findByIdForUserWithRoles.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockImplementation((moduleName) => moduleName === 'agents');
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValueOnce([]);
			agentRepository.findByProjectId.mockResolvedValueOnce([
				{ id: 'agent-1' },
				{ id: 'agent-2' },
			] as never);

			await projectService.deleteProject(user, project.id);

			expect(agentRepository.findByProjectId).toHaveBeenCalledWith(project.id);
			expect(agentChatAttachmentService.deleteByAgent).toHaveBeenCalledWith('agent-1');
			expect(agentChatAttachmentService.deleteByAgent).toHaveBeenCalledWith('agent-2');
			expect(agentChatAttachmentService.deleteByAgent.mock.invocationCallOrder[1]).toBeLessThan(
				projectRepository.remove.mock.invocationCallOrder[0],
			);
			expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith(
				project.id,
				'agent-1',
			);
			expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith(
				project.id,
				'agent-2',
			);
			expect(agentKnowledgeService.deleteAllFilesForAgent.mock.invocationCallOrder[1]).toBeLessThan(
				projectRepository.remove.mock.invocationCallOrder[0],
			);
			expect(agentKnowledgeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
				project.id,
				'agent-1',
			);
			expect(agentKnowledgeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
				project.id,
				'agent-2',
			);
			expect(agentExecutionService.deleteExecutionLogsForAgent).toHaveBeenCalledWith('agent-1');
			expect(agentExecutionService.deleteExecutionLogsForAgent).toHaveBeenCalledWith('agent-2');
		});

		describe('migrating end-user credentials', () => {
			// all scopes deleteProject needs, so both project lookups short-circuit on global scope
			const migratingUser = {
				id: 'user-1',
				role: {
					slug: 'global:owner',
					scopes: [
						{ slug: 'project:delete' },
						{ slug: 'credential:create' },
						{ slug: 'workflow:create' },
						{ slug: 'dataTable:create' },
					],
				},
			} as any;
			const project = mock<Project>({ id: 'project-1', type: 'team' });
			const endUserCredential = mock<SharedCredentials>({
				credentialsId: 'credential-1',
				credentials: mock<SharedCredentials['credentials']>({
					id: 'credential-1',
					name: 'End-user credential',
					isResolvable: true,
				}),
			});

			beforeEach(() => {
				Object.defineProperty(projectService, 'connectionStatusProxy', {
					configurable: true,
					get: async () => mock<ICredentialConnectionStatusProvider>(),
				});
				// reset first: `vi.clearAllMocks()` leaves any unconsumed `...Once` queues behind
				projectRepository.findByIdForUserWithRoles.mockReset();
				sharedWorkflowRepository.find.mockReset();
				sharedCredentialsRepository.find.mockReset();
				projectRelationRepository.findUserIdsByProjectId.mockReset();
				projectRepository.remove.mockResolvedValue(project);
				sharedWorkflowRepository.find.mockResolvedValue([]);
				sharedCredentialsRepository.find.mockResolvedValue([endUserCredential]);
				moduleRegistry.isActive.mockReturnValue(false);
				projectRelationRepository.findUserIdsByProjectId.mockResolvedValue([]);
			});

			it('rejects a migration into a personal project before anything is migrated', async () => {
				// ARRANGE — source team project, target personal project
				projectRepository.findByIdForUserWithRoles
					.mockResolvedValueOnce(project)
					.mockResolvedValueOnce(mock<Project>({ id: 'personal-1', type: 'personal' }));

				// ACT
				const deletion = projectService.deleteProject(migratingUser, project.id, {
					migrateToProject: 'personal-1',
				});

				// ASSERT — rejected, naming the offending credential
				await expect(deletion).rejects.toThrow(BadRequestError);
				await expect(deletion).rejects.toThrow('"End-user credential"');

				// nothing moved, project still there
				expect(sharedWorkflowRepository.makeOwner).not.toHaveBeenCalled();
				expect(sharedCredentialsRepository.makeOwner).not.toHaveBeenCalled();
				expect(projectRepository.remove).not.toHaveBeenCalled();
			});

			it('migrates end-user credentials into a team project', async () => {
				// ARRANGE — source and target are both team projects
				projectRepository.findByIdForUserWithRoles
					.mockResolvedValueOnce(project)
					.mockResolvedValueOnce(mock<Project>({ id: 'team-2', type: 'team' }));

				// ACT
				await projectService.deleteProject(migratingUser, project.id, {
					migrateToProject: 'team-2',
				});

				// ASSERT
				expect(sharedCredentialsRepository.makeOwner).toHaveBeenCalledWith(
					['credential-1'],
					'team-2',
				);
				expect(projectRepository.remove).toHaveBeenCalledWith(project);

				expect(eventService.emit).toHaveBeenCalledWith('team-project-deleted', {
					userId: 'user-1',
					role: 'global:owner',
					projectId: project.id,
					removalType: 'transfer',
					targetProjectId: 'team-2',
				});
			});
		});

		it('destroys agent sandboxes even when knowledge file cleanup fails', async () => {
			const project = mock<Project>({ id: 'project-1', type: 'team' });
			Object.defineProperty(projectService, 'agentRepository', {
				configurable: true,
				get: async () => agentRepository,
			});
			Object.defineProperty(projectService, 'agentKnowledgeService', {
				configurable: true,
				get: async () => agentKnowledgeService,
			});
			Object.defineProperty(projectService, 'agentExecutionService', {
				configurable: true,
				get: async () => agentExecutionService,
			});
			Object.defineProperty(projectService, 'agentChatAttachmentService', {
				configurable: true,
				get: async () => agentChatAttachmentService,
			});
			projectRepository.findByIdForUserWithRoles.mockResolvedValueOnce(project);
			projectRepository.remove.mockResolvedValueOnce(project);
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			moduleRegistry.isActive.mockImplementation((moduleName) => moduleName === 'agents');
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValueOnce([]);
			agentRepository.findByProjectId.mockResolvedValueOnce([{ id: 'agent-1' }] as never);
			agentKnowledgeService.deleteAllFilesForAgent.mockRejectedValueOnce(new Error('storage down'));
			agentChatAttachmentService.deleteByAgent.mockRejectedValueOnce(new Error('storage down'));

			await expect(projectService.deleteProject(user, project.id)).resolves.toBeUndefined();

			expect(agentKnowledgeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
				project.id,
				'agent-1',
			);
			expect(agentExecutionService.deleteExecutionLogsForAgent).toHaveBeenCalledWith('agent-1');
			expect(projectRepository.remove).toHaveBeenCalledWith(project);
		});
	});

	describe('findExistingProjectIds', () => {
		it('returns an empty set without querying when no ids are given', async () => {
			const result = await projectService.findExistingProjectIds([]);

			expect(result.size).toBe(0);
			expect(projectRepository.find).not.toHaveBeenCalled();
		});

		it('returns the ids that exist in the database, unscoped by access', async () => {
			projectRepository.findExistingIds.mockResolvedValueOnce(['proj-1']);

			const result = await projectService.findExistingProjectIds(['proj-1', 'proj-missing']);

			expect(result).toEqual(new Set(['proj-1']));
		});
	});

	describe('getProjectWithScope', () => {
		it('threads the operation context through role and project lookups', async () => {
			const ctx: OperationContext = {};
			const member = mock<User>({ id: 'member-1', role: mock({ scopes: [] }) });
			const roles = [mock<Role>({ slug: 'project:viewer' })];
			const project = mock<Project>({ id: 'project-1' });
			projectRepository.loadRolesForProjectScopeCheck.mockResolvedValueOnce(roles);
			roleService.rolesWithScope.mockImplementationOnce(async (_namespace, _scopes, loadRoles) => {
				await loadRoles?.();
				return ['project:viewer'];
			});
			projectRepository.findByIdForUserWithRoles.mockResolvedValueOnce(project);

			const result = await projectService.getProjectWithScope(
				member,
				project.id,
				['project:read'],
				ctx,
			);

			expect(projectRepository.loadRolesForProjectScopeCheck).toHaveBeenCalledWith(ctx);
			expect(projectRepository.findByIdForUserWithRoles).toHaveBeenCalledWith(
				project.id,
				member.id,
				['project:viewer'],
				ctx,
			);
			expect(result).toBe(project);
		});
	});

	describe('findUserIdsByProjectId', () => {
		it('delegates to the project relation repository', async () => {
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValueOnce(['user-1', 'user-2']);

			const result = await projectService.findUserIdsByProjectId('project-1');

			expect(projectRelationRepository.findUserIdsByProjectId).toHaveBeenCalledWith('project-1');
			expect(result).toEqual(['user-1', 'user-2']);
		});
	});
});
