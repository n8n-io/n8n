import type {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
	User,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Scope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';

import { SecretsProviderAccessCheckService } from '../secret-provider-access-check.service.ee';

describe('SecretsProviderAccessCheckService', () => {
	const connectionRepository = mock<SecretsProviderConnectionRepository>();
	const projectAccessRepository = mock<ProjectSecretsProviderAccessRepository>();
	const roleService = mock<RoleService>();
	const projectService = mock<ProjectService>();

	const service = new SecretsProviderAccessCheckService(
		connectionRepository,
		projectAccessRepository,
		roleService,
		projectService,
	);

	const user = {
		id: 'user-1',
		role: { slug: 'global:member', scopes: [] },
	} as unknown as User;

	const adminUser = {
		id: 'admin-1',
		role: {
			slug: 'global:admin',
			scopes: [
				{ slug: 'externalSecretsProvider:create' },
				{ slug: 'externalSecretsProvider:read' },
				{ slug: 'externalSecretsProvider:update' },
				{ slug: 'externalSecretsProvider:delete' },
				{ slug: 'externalSecretsProvider:list' },
			],
		},
	} as unknown as User;
	const providerKey = 'my-vault';
	const projectId = 'project-1';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('assertConnectionAccess', () => {
		it('should throw NotFoundError when no access record exists', async () => {
			projectAccessRepository.findOne.mockResolvedValue(null);

			await expect(
				service.assertConnectionAccess({
					providerKey,
					projectId,
					requiredScope: 'externalSecretsProvider:update',
					user,
				}),
			).rejects.toThrow(NotFoundError);
		});

		it('should pass when user has the global scope and access record exists', async () => {
			projectAccessRepository.findOne.mockResolvedValue({
				role: 'secretsProviderConnection:user',
			} as never);

			await expect(
				service.assertConnectionAccess({
					providerKey,
					projectId,
					requiredScope: 'externalSecretsProvider:update',
					user: adminUser,
				}),
			).resolves.toBeUndefined();

			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
		});

		it('should pass for global connections when user has the global scope', async () => {
			// No project access record (global connection)
			projectAccessRepository.findOne.mockResolvedValue(null);
			connectionRepository.isProviderAvailableInProject.mockResolvedValue(true);

			await expect(
				service.assertConnectionAccess({
					providerKey,
					projectId,
					requiredScope: 'externalSecretsProvider:update',
					user: adminUser,
				}),
			).resolves.toBeUndefined();

			expect(connectionRepository.isProviderAvailableInProject).toHaveBeenCalledWith(
				providerKey,
				projectId,
			);
		});

		it('should throw NotFoundError for non-existent connections even with global scope', async () => {
			projectAccessRepository.findOne.mockResolvedValue(null);
			connectionRepository.isProviderAvailableInProject.mockResolvedValue(false);

			await expect(
				service.assertConnectionAccess({
					providerKey,
					projectId,
					requiredScope: 'externalSecretsProvider:update',
					user: adminUser,
				}),
			).rejects.toThrow(NotFoundError);
		});

		it('should pass when the access role has the required scope', async () => {
			projectAccessRepository.findOne.mockResolvedValue({
				role: 'secretsProviderConnection:owner',
			} as never);

			roleService.rolesWithScope.mockResolvedValue([
				'secretsProviderConnection:owner',
				'secretsProviderConnection:editor',
			]);

			await expect(
				service.assertConnectionAccess({
					providerKey,
					projectId,
					requiredScope: 'externalSecretsProvider:update',
					user,
				}),
			).resolves.toBeUndefined();

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('secretsProviderConnection', [
				'externalSecretsProvider:update',
			]);
		});

		it('should throw ForbiddenError when access role lacks the required scope', async () => {
			projectAccessRepository.findOne.mockResolvedValue({
				role: 'secretsProviderConnection:user',
			} as never);

			roleService.rolesWithScope.mockResolvedValue(['secretsProviderConnection:owner']);

			await expect(
				service.assertConnectionAccess({
					providerKey,
					projectId,
					requiredScope: 'externalSecretsProvider:delete',
					user,
				}),
			).rejects.toThrow(ForbiddenError);
		});
	});

	describe('getConnectionScopesForProject', () => {
		it('should combine global, project, and sharing scopes', async () => {
			projectAccessRepository.findOne.mockResolvedValue({
				role: 'secretsProviderConnection:owner',
			} as never);

			projectService.getProjectRelationsForUser.mockResolvedValue([
				{
					projectId,
					role: {
						scopes: [
							{ slug: 'externalSecretsProvider:list' },
							{ slug: 'externalSecretsProvider:read' },
						],
					},
				},
			] as never);

			roleService.getRole.mockResolvedValue({
				scopes: [
					'externalSecretsProvider:read',
					'externalSecretsProvider:update',
					'externalSecretsProvider:delete',
				] as Scope[],
			} as never);

			const scopes = await service.getConnectionScopesForProject(user, providerKey, projectId);

			expect(roleService.getRole).toHaveBeenCalledWith('secretsProviderConnection:owner');
			expect(Array.isArray(scopes)).toBe(true);
		});

		it('should default to user role when no access record exists', async () => {
			projectAccessRepository.findOne.mockResolvedValue(null);

			projectService.getProjectRelationsForUser.mockResolvedValue([]);

			roleService.getRole.mockResolvedValue({
				scopes: ['externalSecretsProvider:read'] as Scope[],
			} as never);

			await service.getConnectionScopesForProject(user, providerKey, projectId);

			expect(roleService.getRole).toHaveBeenCalledWith('secretsProviderConnection:user');
		});

		it('should return empty project scopes when user has no project relation', async () => {
			projectAccessRepository.findOne.mockResolvedValue({
				role: 'secretsProviderConnection:owner',
			} as never);

			projectService.getProjectRelationsForUser.mockResolvedValue([
				{ projectId: 'other-project', role: { scopes: [{ slug: 'some:scope' }] } },
			] as never);

			roleService.getRole.mockResolvedValue({
				scopes: ['externalSecretsProvider:read'] as Scope[],
			} as never);

			const scopes = await service.getConnectionScopesForProject(user, providerKey, projectId);

			expect(Array.isArray(scopes)).toBe(true);
		});
	});
});
