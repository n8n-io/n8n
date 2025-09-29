import {
	GLOBAL_MEMBER_ROLE,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { type Scope } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { RoleService } from '@/services/role.service';

import { userHasScopes } from '../check-access';

describe('userHasScopes', () => {
	let findByWorkflowMock: jest.Mock;
	let findByCredentialMock: jest.Mock;
	let roleServiceMock: jest.Mock;
	let mockQueryBuilder: any;

	beforeAll(() => {
		findByWorkflowMock = jest.fn();
		findByCredentialMock = jest.fn();
		roleServiceMock = jest.fn();

		Container.set(
			SharedWorkflowRepository,
			mock<SharedWorkflowRepository>({
				findBy: findByWorkflowMock,
			}),
		);

		Container.set(
			SharedCredentialsRepository,
			mock<SharedCredentialsRepository>({
				findBy: findByCredentialMock,
			}),
		);

		mockQueryBuilder = {
			innerJoin: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			groupBy: jest.fn().mockReturnThis(),
			having: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			getRawMany: jest.fn().mockResolvedValue([{ id: 'projectId' }]),
		};

		Container.set(
			ProjectRepository,
			mock<ProjectRepository>({
				createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
			}),
		);

		Container.set(
			RoleService,
			mock<RoleService>({
				rolesWithScope: roleServiceMock,
			}),
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		findByWorkflowMock.mockReset();
		findByCredentialMock.mockReset();
		roleServiceMock.mockReset();

		// Default mock responses
		mockQueryBuilder.getRawMany.mockResolvedValue([{ id: 'projectId' }]);
	});

	describe('resource not found scenarios', () => {
		it.each<{ type: 'workflow' | 'credential'; id: string }>([
			{ type: 'workflow', id: 'workflowId' },
			{ type: 'credential', id: 'credentialId' },
		])('should throw NotFoundError if $type is not found', async ({ type, id }) => {
			findByWorkflowMock.mockResolvedValue([]);
			findByCredentialMock.mockResolvedValue([]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['workflow:read', 'credential:read'] as Scope[];

			const params: { credentialId?: string; workflowId?: string; projectId?: string } = {};
			if (type === 'credential') {
				params.credentialId = id;
			} else {
				params.workflowId = id;
			}

			await expect(userHasScopes(user, scopes, false, params)).rejects.toThrow(NotFoundError);
		});
	});

	describe('RoleService integration', () => {
		it('should use RoleService for credential role resolution', async () => {
			const credentialId = 'cred123';
			const mockRoles = ['credential:owner', 'custom:credential-admin'];

			roleServiceMock.mockResolvedValue(mockRoles);
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'credential:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:read'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { credentialId });

			expect(roleServiceMock).toHaveBeenCalledWith('credential', scopes);
			expect(result).toBe(true);
		});

		it('should use RoleService for workflow role resolution', async () => {
			const workflowId = 'wf123';
			const mockRoles = ['workflow:owner', 'custom:workflow-manager'];

			roleServiceMock.mockResolvedValue(mockRoles);
			findByWorkflowMock.mockResolvedValue([
				{
					workflowId,
					projectId: 'projectId',
					role: 'workflow:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['workflow:read'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { workflowId });

			expect(roleServiceMock).toHaveBeenCalledWith('workflow', scopes);
			expect(result).toBe(true);
		});

		it('should handle custom database roles in access control', async () => {
			const credentialId = 'cred123';
			const customRoles = ['custom:admin-role-abc123', 'credential:owner'];

			roleServiceMock.mockResolvedValue(customRoles);
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'custom:admin-role-abc123', // Custom role from database
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:update'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { credentialId });

			expect(roleServiceMock).toHaveBeenCalledWith('credential', scopes);
			expect(result).toBe(true);
		});

		it('should propagate RoleService errors appropriately', async () => {
			const credentialId = 'cred123';
			const roleServiceError = new Error('Role cache unavailable');

			roleServiceMock.mockRejectedValue(roleServiceError);
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'credential:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:read'] as Scope[];

			await expect(userHasScopes(user, scopes, false, { credentialId })).rejects.toThrow(
				roleServiceError,
			);
		});
	});

	describe('namespace isolation', () => {
		it('should use correct namespace for credential checks', async () => {
			const credentialId = 'cred123';
			roleServiceMock.mockResolvedValue(['credential:owner']);
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'credential:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;

			await userHasScopes(user, ['credential:read'], false, { credentialId });

			expect(roleServiceMock).toHaveBeenCalledWith('credential', ['credential:read']);
			expect(roleServiceMock).not.toHaveBeenCalledWith('workflow', expect.anything());
		});

		it('should use correct namespace for workflow checks', async () => {
			const workflowId = 'wf123';
			roleServiceMock.mockResolvedValue(['workflow:owner']);
			findByWorkflowMock.mockResolvedValue([
				{
					workflowId,
					projectId: 'projectId',
					role: 'workflow:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;

			await userHasScopes(user, ['workflow:execute'], false, { workflowId });

			expect(roleServiceMock).toHaveBeenCalledWith('workflow', ['workflow:execute']);
			expect(roleServiceMock).not.toHaveBeenCalledWith('credential', expect.anything());
		});

		it('should not allow workflow roles to access credentials', async () => {
			const credentialId = 'cred123';
			// RoleService returns no matching credential roles
			roleServiceMock.mockResolvedValue([]);
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'workflow:owner', // Wrong namespace role
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:read'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { credentialId });

			expect(result).toBe(false);
		});
	});

	describe('access control scenarios', () => {
		it('should grant access when user has matching project and resource role', async () => {
			const credentialId = 'cred123';
			roleServiceMock.mockResolvedValue(['credential:owner', 'credential:user']);
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'credential:user',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:read'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { credentialId });

			expect(result).toBe(true);
		});

		it('should deny access when user has project access but insufficient resource role', async () => {
			const credentialId = 'cred123';
			roleServiceMock.mockResolvedValue(['credential:owner']); // Only owner role has required scopes
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'credential:viewer', // User has viewer role, but needs owner
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:delete'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { credentialId });

			expect(result).toBe(false);
		});

		it('should deny access when user has no project access', async () => {
			const credentialId = 'cred123';
			mockQueryBuilder.getRawMany.mockResolvedValue([]); // No project access
			roleServiceMock.mockResolvedValue(['credential:owner']);
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'otherProjectId',
					role: 'credential:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:read'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { credentialId });

			expect(result).toBe(false);
		});

		it('should handle multiple scope requirements', async () => {
			const workflowId = 'wf123';
			roleServiceMock.mockResolvedValue(['workflow:owner']); // Owner role has multiple scopes
			findByWorkflowMock.mockResolvedValue([
				{
					workflowId,
					projectId: 'projectId',
					role: 'workflow:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['workflow:read', 'workflow:execute'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { workflowId });

			expect(roleServiceMock).toHaveBeenCalledWith('workflow', scopes);
			expect(result).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle empty role results from RoleService', async () => {
			const credentialId = 'cred123';
			roleServiceMock.mockResolvedValue([]); // No roles match the scopes
			findByCredentialMock.mockResolvedValue([
				{
					credentialsId: credentialId,
					projectId: 'projectId',
					role: 'credential:owner',
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['*' as const] as Scope[]; // Use wildcard scope for testing

			const result = await userHasScopes(user, scopes, false, { credentialId });

			expect(result).toBe(false);
		});

		it('should handle multiple resource shares in same project', async () => {
			const workflowId = 'wf123';
			roleServiceMock.mockResolvedValue(['workflow:editor']);
			findByWorkflowMock.mockResolvedValue([
				{
					workflowId,
					projectId: 'projectId',
					role: 'workflow:viewer', // First share - insufficient
				},
				{
					workflowId,
					projectId: 'projectId',
					role: 'workflow:editor', // Second share - sufficient
				},
			]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['workflow:update'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { workflowId });

			expect(result).toBe(true);
		});

		it('should handle project-only checks without RoleService', async () => {
			const projectId = 'proj123';
			// Project checks don't use RoleService
			mockQueryBuilder.getRawMany.mockResolvedValue([{ id: projectId }]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['project:read'] as Scope[];

			const result = await userHasScopes(user, scopes, false, { projectId });

			expect(roleServiceMock).not.toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should handle concurrent permission checks', async () => {
			const credentialId1 = 'cred1';
			const credentialId2 = 'cred2';

			roleServiceMock.mockResolvedValue(['credential:owner']);
			findByCredentialMock
				.mockResolvedValueOnce([
					{ credentialsId: credentialId1, projectId: 'projectId', role: 'credential:owner' },
				])
				.mockResolvedValueOnce([
					{ credentialsId: credentialId2, projectId: 'projectId', role: 'credential:viewer' },
				]);

			const user = { id: 'userId', scopes: [], role: GLOBAL_MEMBER_ROLE } as unknown as User;
			const scopes = ['credential:read'] as Scope[];

			const [result1, result2] = await Promise.all([
				userHasScopes(user, scopes, false, { credentialId: credentialId1 }),
				userHasScopes(user, scopes, false, { credentialId: credentialId2 }),
			]);

			expect(result1).toBe(true);
			expect(result2).toBe(false);
			expect(roleServiceMock).toHaveBeenCalledTimes(2);
		});
	});
});
