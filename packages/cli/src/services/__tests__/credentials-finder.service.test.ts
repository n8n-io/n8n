import {
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	type SharedCredentials,
	CredentialsRepository,
	SharedCredentialsRepository,
	CredentialsEntity,
} from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
} from '@n8n/permissions';
import { In } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { mockInstance } from '@n8n/backend-test-utils';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { RoleService } from '../role.service';

describe('CredentialsFinderService', () => {
	const roleService = mockInstance(RoleService);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const sharedCredentialsRepository = mockInstance(SharedCredentialsRepository);
	const credentialsFinderService = Container.get(CredentialsFinderService);

	beforeAll(() => {
		Container.set(RoleService, roleService);
		Container.set(CredentialsRepository, credentialsRepository);
		Container.set(SharedCredentialsRepository, sharedCredentialsRepository);
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup manager mock for global credentials fetching
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		// @ts-ignore
		credentialsRepository.manager = {
			find: jest.fn().mockResolvedValue([]),
		} as any;

		// Default mock implementation for all tests
		roleService.rolesWithScope.mockImplementation(async (namespace) => {
			if (namespace === 'project') {
				return [
					PROJECT_ADMIN_ROLE_SLUG,
					PROJECT_OWNER_ROLE_SLUG,
					PROJECT_EDITOR_ROLE_SLUG,
					PROJECT_VIEWER_ROLE_SLUG,
				];
			} else if (namespace === 'credential') {
				return ['credential:owner', 'credential:user'];
			}
			return [];
		});
	});

	describe('findCredentialForUser', () => {
		const credentialsId = 'cred_123';
		const sharedCredential = mock<SharedCredentials>();
		sharedCredential.credentials = mock<CredentialsEntity>({ id: credentialsId });
		const owner = mock<User>({
			role: GLOBAL_OWNER_ROLE,
		});
		const member = mock<User>({
			role: GLOBAL_MEMBER_ROLE,
			id: 'test',
		});

		test('should allow instance owner access to all credentials', async () => {
			sharedCredentialsRepository.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				owner,
				['credential:read' as const],
			);
			expect(sharedCredentialsRepository.findOne).toHaveBeenCalledWith({
				where: { credentialsId },
				relations: {
					credentials: {
						shared: { project: true },
					},
				},
			});
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(credential).toEqual(sharedCredential.credentials);
		});

		test('should allow members and call RoleService correctly', async () => {
			sharedCredentialsRepository.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:read' as const],
			);

			expect(roleService.rolesWithScope).toHaveBeenCalledTimes(2);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['credential:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('credential', ['credential:read']);

			expect(sharedCredentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					credentialsId,
					role: In(['credential:owner', 'credential:user']),
					project: {
						projectRelations: {
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
							userId: member.id,
						},
					},
				},
				relations: {
					credentials: {
						shared: { project: true },
					},
				},
			});
			expect(credential).toEqual(sharedCredential.credentials);
		});

		test('should return null when no shared credential is found and not global', async () => {
			sharedCredentialsRepository.findOne.mockResolvedValueOnce(null);
			credentialsRepository.findOne.mockResolvedValueOnce(null);
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:read' as const],
			);
			expect(sharedCredentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					credentialsId,
					role: In(['credential:owner', 'credential:user']),
					project: {
						projectRelations: {
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
							userId: member.id,
						},
					},
				},
				relations: {
					credentials: {
						shared: { project: true },
					},
				},
			});
			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: credentialsId,
					isGlobal: true,
				},
				relations: {
					shared: { project: true },
				},
			});
			expect(credential).toEqual(null);
		});

		test('should return global credential when not shared but is global for credential:read scope', async () => {
			const globalCredential = mock<CredentialsEntity>({ id: credentialsId, isGlobal: true });
			sharedCredentialsRepository.findOne.mockResolvedValueOnce(null);
			credentialsRepository.findOne.mockResolvedValueOnce(globalCredential);

			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:read' as const],
			);

			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: credentialsId,
					isGlobal: true,
				},
				relations: {
					shared: { project: true },
				},
			});
			expect(credential).toEqual(globalCredential);
		});

		test('should not fallback to global credential for write scopes', async () => {
			sharedCredentialsRepository.findOne.mockResolvedValueOnce(null);

			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:update' as const],
			);

			expect(credentialsRepository.findOne).not.toHaveBeenCalled();
			expect(credential).toEqual(null);
		});

		test('should not fallback to global credential for multiple scopes', async () => {
			sharedCredentialsRepository.findOne.mockResolvedValueOnce(null);

			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:read' as const, 'credential:update' as const],
			);

			expect(credentialsRepository.findOne).not.toHaveBeenCalled();
			expect(credential).toEqual(null);
		});

		test('should handle custom roles from RoleService', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') {
					return ['custom:project-admin-abc123', PROJECT_VIEWER_ROLE_SLUG];
				} else if (namespace === 'credential') {
					return ['custom:cred-manager-xyz789', 'credential:user'];
				}
				return [];
			});

			sharedCredentialsRepository.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:update' as const],
			);

			expect(sharedCredentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					credentialsId,
					role: In(['custom:cred-manager-xyz789', 'credential:user']),
					project: {
						projectRelations: {
							role: In(['custom:project-admin-abc123', PROJECT_VIEWER_ROLE_SLUG]),
							userId: member.id,
						},
					},
				},
				relations: {
					credentials: {
						shared: { project: true },
					},
				},
			});
			expect(credential).toEqual(sharedCredential.credentials);
		});

		test('should handle RoleService failure gracefully', async () => {
			roleService.rolesWithScope.mockRejectedValue(new Error('Role cache unavailable'));

			await expect(
				credentialsFinderService.findCredentialForUser(credentialsId, member, [
					'credential:read' as const,
				]),
			).rejects.toThrow('Role cache unavailable');

			expect(sharedCredentialsRepository.findOne).not.toHaveBeenCalled();
		});
	});

	describe('findCredentialsForUser', () => {
		const credentials = [
			mock<CredentialsEntity>({ id: 'cred1', shared: [] }),
			mock<CredentialsEntity>({ id: 'cred2', shared: [] }),
		];
		const owner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		const member = mock<User>({ role: GLOBAL_MEMBER_ROLE, id: 'user123' });

		beforeEach(() => {
			jest.clearAllMocks();
		});

		test('should allow global owner access to all credentials without role filtering', async () => {
			credentialsRepository.find.mockResolvedValueOnce(credentials);
			const result = await credentialsFinderService.findCredentialsForUser(owner, [
				'credential:read' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: { isGlobal: false },
				relations: { shared: true },
			});
			expect(credentialsRepository.manager.find).toHaveBeenCalledWith(CredentialsEntity, {
				where: { isGlobal: true },
				relations: { shared: true },
			});
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(result).toEqual([...credentials]);
		});

		test('should filter credentials by roles for regular members', async () => {
			credentialsRepository.find.mockResolvedValueOnce(credentials);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:update' as const,
			]);

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['credential:update']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('credential', ['credential:update']);
			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					isGlobal: false,
					shared: {
						role: In(['credential:owner', 'credential:user']),
						project: {
							projectRelations: {
								role: In([
									PROJECT_ADMIN_ROLE_SLUG,
									PROJECT_OWNER_ROLE_SLUG,
									PROJECT_EDITOR_ROLE_SLUG,
									PROJECT_VIEWER_ROLE_SLUG,
								]),
								userId: member.id,
							},
						},
					},
				},
				relations: { shared: true },
			});
			// Should NOT fetch global credentials for update scope
			expect(credentialsRepository.manager.find).not.toHaveBeenCalled();
			expect(result).toEqual(credentials);
		});

		test('should include global credentials when user has read-only access', async () => {
			const mockGlobalCredentials = [
				mock<CredentialsEntity>({ id: 'global1', isGlobal: true }),
				mock<CredentialsEntity>({ id: 'global2', isGlobal: true }),
			];
			credentialsRepository.find.mockResolvedValueOnce(credentials);
			(credentialsRepository.manager.find as jest.Mock).mockResolvedValueOnce(
				mockGlobalCredentials,
			);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:read' as const,
			]);

			// Should include both non-global (cred1, cred2) and global (global1, global2)
			expect(result).toHaveLength(4);
			expect(result.map((c) => c.id)).toEqual(['cred1', 'cred2', 'global1', 'global2']);
		});

		test('should not include global credentials when user has write access', async () => {
			const mockGlobalCredentials = [
				mock<CredentialsEntity>({ id: 'global1', isGlobal: true }),
				mock<CredentialsEntity>({ id: 'global2', isGlobal: true }),
			];
			credentialsRepository.find.mockResolvedValueOnce(credentials);
			(credentialsRepository.manager.find as jest.Mock).mockResolvedValueOnce(
				mockGlobalCredentials,
			);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:update' as const,
			]);

			// Should only include non-global credentials (cred1, cred2)
			expect(result).toHaveLength(2);
			expect(result.map((c) => c.id)).toEqual(['cred1', 'cred2']);
			// Should not call fetchGlobalCredentials when not read-only
			expect(credentialsRepository.manager.find).not.toHaveBeenCalled();
		});

		test('should not include global credentials when user has multiple scopes', async () => {
			const mockGlobalCredentials = [
				mock<CredentialsEntity>({ id: 'global1', isGlobal: true }),
				mock<CredentialsEntity>({ id: 'global2', isGlobal: true }),
			];
			credentialsRepository.find.mockResolvedValueOnce(credentials);
			(credentialsRepository.manager.find as jest.Mock).mockResolvedValueOnce(
				mockGlobalCredentials,
			);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:read' as const,
				'credential:list' as const,
			]);

			// Should only include non-global credentials (cred1, cred2)
			expect(result).toHaveLength(2);
			expect(result.map((c) => c.id)).toEqual(['cred1', 'cred2']);
			// Should not call fetchGlobalCredentials when multiple scopes
			expect(credentialsRepository.manager.find).not.toHaveBeenCalled();
		});

		test('should handle empty global credentials list with read-only access', async () => {
			credentialsRepository.find.mockResolvedValueOnce(credentials);
			(credentialsRepository.manager.find as jest.Mock).mockResolvedValueOnce([]);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(result).toEqual(credentials);
			// Should call fetchGlobalCredentials when read-only
			expect(credentialsRepository.manager.find).toHaveBeenCalledWith(CredentialsEntity, {
				where: { isGlobal: true },
				relations: { shared: true },
			});
		});

		test('should handle custom roles in filtering', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') return ['custom:project-lead-456'];
				if (namespace === 'credential') return ['custom:cred-admin-789'];
				return [];
			});

			const singleCredResult = [credentials[0]];
			credentialsRepository.find.mockResolvedValueOnce(singleCredResult);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:delete' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					isGlobal: false,
					shared: {
						role: In(['custom:cred-admin-789']),
						project: {
							projectRelations: {
								role: In(['custom:project-lead-456']),
								userId: member.id,
							},
						},
					},
				},
				relations: { shared: true },
			});
			expect(result).toEqual(singleCredResult);
		});
	});

	describe('findAllCredentialsForUser', () => {
		const sharedCredentials = [
			mock<SharedCredentials>({
				credentials: mock<CredentialsEntity>({ id: 'cred1' }),
				projectId: 'proj1',
				credentialsId: 'cred1',
				role: 'credential:owner',
			}),
			mock<SharedCredentials>({
				credentials: mock<CredentialsEntity>({ id: 'cred2' }),
				projectId: 'proj2',
				credentialsId: 'cred2',
				role: 'credential:user',
			}),
		];
		const owner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		const member = mock<User>({ role: GLOBAL_MEMBER_ROLE, id: 'user123' });

		beforeEach(() => {
			jest.clearAllMocks();

			// Reset to default implementation for each test
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') {
					return [
						PROJECT_ADMIN_ROLE_SLUG,
						PROJECT_OWNER_ROLE_SLUG,
						PROJECT_EDITOR_ROLE_SLUG,
						PROJECT_VIEWER_ROLE_SLUG,
					];
				} else if (namespace === 'credential') {
					return ['credential:owner', 'credential:user'];
				}
				return [];
			});
		});

		test('should allow global owner access without filtering', async () => {
			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce(
				sharedCredentials,
			);

			const result = await credentialsFinderService.findAllCredentialsForUser(owner, [
				'credential:read' as const,
			]);

			expect(sharedCredentialsRepository.findCredentialsWithOptions).toHaveBeenCalledWith(
				{},
				undefined,
			);
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(result).toEqual([
				{ ...sharedCredentials[0].credentials, projectId: 'proj1' },
				{ ...sharedCredentials[1].credentials, projectId: 'proj2' },
			]);
		});

		test('should filter by roles for regular members', async () => {
			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce([
				sharedCredentials[0],
			]);

			const result = await credentialsFinderService.findAllCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['credential:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('credential', ['credential:read']);
			expect(sharedCredentialsRepository.findCredentialsWithOptions).toHaveBeenCalledWith(
				{
					role: In(['credential:owner', 'credential:user']),
					project: {
						projectRelations: {
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
							userId: member.id,
						},
					},
				},
				undefined,
			);
			expect(result).toEqual([{ ...sharedCredentials[0].credentials, projectId: 'proj1' }]);
		});

		test('should support transaction manager', async () => {
			const mockTrx = mock<any>();
			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce([]);

			await credentialsFinderService.findAllCredentialsForUser(
				member,
				['credential:read' as const],
				mockTrx,
			);

			expect(sharedCredentialsRepository.findCredentialsWithOptions).toHaveBeenCalledWith(
				expect.any(Object),
				mockTrx,
			);
		});

		test('should include global credentials when includeGlobalCredentials flag is true', async () => {
			const globalCredential = mock<CredentialsEntity>({
				id: 'global1',
				isGlobal: true,
				shared: [
					mock<SharedCredentials>({
						credentialsId: 'global1',
						role: 'credential:owner',
						projectId: 'proj-owner',
					}),
				],
			});

			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce(
				sharedCredentials,
			);
			credentialsRepository.manager.find = jest.fn().mockResolvedValueOnce([globalCredential]);

			const result = await credentialsFinderService.findAllCredentialsForUser(
				member,
				['credential:read' as const],
				undefined,
				{ includeGlobalCredentials: true },
			);

			expect(credentialsRepository.manager.find).toHaveBeenCalledWith(CredentialsEntity, {
				where: { isGlobal: true },
				relations: { shared: true },
			});
			expect(result).toHaveLength(3);
			expect(result[2]).toEqual({ ...globalCredential, projectId: 'proj-owner' });
		});

		test('should not include global credentials when includeGlobalCredentials flag is false', async () => {
			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce(
				sharedCredentials,
			);

			const result = await credentialsFinderService.findAllCredentialsForUser(
				member,
				['credential:read' as const],
				undefined,
				{ includeGlobalCredentials: false },
			);

			expect(credentialsRepository.manager.find).not.toHaveBeenCalled();
			expect(result).toHaveLength(2);
		});

		test('should not include global credentials when no options provided', async () => {
			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce(
				sharedCredentials,
			);

			const result = await credentialsFinderService.findAllCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(credentialsRepository.manager.find).not.toHaveBeenCalled();
			expect(result).toHaveLength(2);
		});

		test('should skip global credentials without valid projectId', async () => {
			const globalCredentialWithoutProject = mock<CredentialsEntity>({
				id: 'global-no-proj',
				isGlobal: true,
				shared: [
					mock<SharedCredentials>({
						credentialsId: 'global-no-proj',
						role: 'credential:user',
						projectId: undefined as any,
					}),
				],
			});

			const globalCredentialWithProject = mock<CredentialsEntity>({
				id: 'global-with-proj',
				isGlobal: true,
				shared: [
					mock<SharedCredentials>({
						credentialsId: 'global-with-proj',
						role: 'credential:owner',
						projectId: 'proj-owner',
					}),
				],
			});

			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce([]);
			credentialsRepository.manager.find = jest
				.fn()
				.mockResolvedValueOnce([globalCredentialWithoutProject, globalCredentialWithProject]);

			const result = await credentialsFinderService.findAllCredentialsForUser(
				member,
				['credential:read' as const],
				undefined,
				{ includeGlobalCredentials: true },
			);

			// Should only include the credential with valid projectId
			expect(result).toHaveLength(1);
			expect(result[0].id).toEqual('global-with-proj');
		});

		test('should deduplicate global credentials with shared credentials', async () => {
			const sharedGlobalCred = mock<SharedCredentials>({
				credentials: mock<CredentialsEntity>({ id: 'cred1' }),
				projectId: 'proj1',
				credentialsId: 'cred1',
				role: 'credential:owner',
			});

			const globalCredential = mock<CredentialsEntity>({
				id: 'cred1', // Same ID as shared credential
				isGlobal: true,
				shared: [
					mock<SharedCredentials>({
						credentialsId: 'cred1',
						role: 'credential:owner',
						projectId: 'proj-owner',
					}),
				],
			});

			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce([
				sharedGlobalCred,
			]);
			credentialsRepository.manager.find = jest.fn().mockResolvedValueOnce([globalCredential]);

			const result = await credentialsFinderService.findAllCredentialsForUser(
				member,
				['credential:read' as const],
				undefined,
				{ includeGlobalCredentials: true },
			);

			// Should not duplicate cred1
			expect(result).toHaveLength(1);
			expect(result[0].id).toEqual('cred1');
		});

		test('should use transaction manager for fetching global credentials', async () => {
			const mockTrx = mock<any>();
			const mockFind = jest.fn().mockResolvedValueOnce([]);
			mockTrx.find = mockFind;

			sharedCredentialsRepository.findCredentialsWithOptions.mockResolvedValueOnce([]);

			await credentialsFinderService.findAllCredentialsForUser(
				member,
				['credential:read' as const],
				mockTrx,
				{ includeGlobalCredentials: true },
			);

			expect(mockFind).toHaveBeenCalledWith(CredentialsEntity, {
				where: { isGlobal: true },
				relations: { shared: true },
			});
		});
	});

	describe('getCredentialIdsByUserAndRole', () => {
		const userIds = ['user1', 'user2'];
		const mockSharings = [
			mock<SharedCredentials>({ credentialsId: 'cred1' }),
			mock<SharedCredentials>({ credentialsId: 'cred2' }),
		];

		beforeEach(() => {
			jest.clearAllMocks();

			// Reset to default implementation
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') {
					return [
						PROJECT_ADMIN_ROLE_SLUG,
						PROJECT_OWNER_ROLE_SLUG,
						PROJECT_EDITOR_ROLE_SLUG,
						PROJECT_VIEWER_ROLE_SLUG,
					];
				} else if (namespace === 'credential') {
					return ['credential:owner', 'credential:user'];
				}
				return [];
			});
		});

		test('should use RoleService when scopes are provided', async () => {
			sharedCredentialsRepository.findCredentialsByRoles.mockResolvedValueOnce(mockSharings);

			const result = await credentialsFinderService.getCredentialIdsByUserAndRole(userIds, {
				scopes: ['credential:read' as const, 'credential:update' as const],
			});

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', [
				'credential:read',
				'credential:update',
			]);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('credential', [
				'credential:read',
				'credential:update',
			]);
			expect(sharedCredentialsRepository.findCredentialsByRoles).toHaveBeenCalledWith(
				userIds,
				[
					PROJECT_ADMIN_ROLE_SLUG,
					PROJECT_OWNER_ROLE_SLUG,
					PROJECT_EDITOR_ROLE_SLUG,
					PROJECT_VIEWER_ROLE_SLUG,
				],
				['credential:owner', 'credential:user'],
				undefined,
			);
			expect(result).toEqual([mockSharings[0].credentialsId, mockSharings[1].credentialsId]);
		});

		test('should use direct roles when provided', async () => {
			const projectRoles = ['custom:project-admin'] as any;
			const credentialRoles = ['custom:cred-viewer'] as any;
			sharedCredentialsRepository.findCredentialsByRoles.mockResolvedValueOnce([mockSharings[0]]);

			const result = await credentialsFinderService.getCredentialIdsByUserAndRole(userIds, {
				projectRoles,
				credentialRoles,
			});

			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(sharedCredentialsRepository.findCredentialsByRoles).toHaveBeenCalledWith(
				userIds,
				projectRoles,
				credentialRoles,
				undefined,
			);
			expect(result).toEqual([mockSharings[0].credentialsId]);
		});

		test('should support transaction manager', async () => {
			const mockTrx = mock<any>();
			sharedCredentialsRepository.findCredentialsByRoles.mockResolvedValueOnce([]);

			await credentialsFinderService.getCredentialIdsByUserAndRole(
				userIds,
				{ scopes: ['credential:read' as const] },
				mockTrx,
			);

			expect(sharedCredentialsRepository.findCredentialsByRoles).toHaveBeenCalledWith(
				expect.any(Array),
				expect.any(Array),
				expect.any(Array),
				mockTrx,
			);
		});

		test('should handle empty results', async () => {
			sharedCredentialsRepository.findCredentialsByRoles.mockResolvedValueOnce([]);

			const result = await credentialsFinderService.getCredentialIdsByUserAndRole(userIds, {
				scopes: ['credential:read' as const],
			});

			expect(result).toEqual([]);
		});
	});

	describe('RoleService integration edge cases', () => {
		const member = mock<User>({ role: GLOBAL_MEMBER_ROLE, id: 'user123' });

		beforeEach(() => {
			jest.clearAllMocks();
		});

		test('should handle empty role results from RoleService', async () => {
			roleService.rolesWithScope.mockResolvedValue([]);
			const emptyResult: CredentialsEntity[] = [];
			credentialsRepository.find.mockResolvedValueOnce(emptyResult);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					isGlobal: false,
					shared: {
						role: In([]),
						project: {
							projectRelations: {
								role: In([]),
								userId: member.id,
							},
						},
					},
				},
				relations: { shared: true },
			});
			expect(result).toEqual(emptyResult);
		});

		test('should handle RoleService failures in findCredentialsForUser', async () => {
			roleService.rolesWithScope.mockRejectedValueOnce(new Error('Database connection failed'));

			await expect(
				credentialsFinderService.findCredentialsForUser(member, ['credential:read' as const]),
			).rejects.toThrow('Database connection failed');

			expect(credentialsRepository.find).not.toHaveBeenCalled();
		});

		test('should handle partial RoleService failures', async () => {
			roleService.rolesWithScope
				.mockResolvedValueOnce(['project:admin']) // First call succeeds
				.mockRejectedValueOnce(new Error('Credential role lookup failed')); // Second call fails

			await expect(
				credentialsFinderService.findCredentialsForUser(member, ['credential:read' as const]),
			).rejects.toThrow('Credential role lookup failed');
		});

		test('should maintain namespace isolation', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') return ['workflow:owner']; // Wrong namespace
				if (namespace === 'credential') return ['project:admin']; // Wrong namespace
				return [];
			});

			const isolationResult: CredentialsEntity[] = [];
			credentialsRepository.find.mockResolvedValueOnce(isolationResult);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					isGlobal: false,
					shared: {
						role: In(['project:admin']), // Uses what RoleService returned for credential namespace
						project: {
							projectRelations: {
								role: In(['workflow:owner']), // Uses what RoleService returned for project namespace
								userId: member.id,
							},
						},
					},
				},
				relations: { shared: true },
			});
			expect(result).toEqual(isolationResult);
		});
	});

	describe('hasGlobalReadOnlyAccess', () => {
		test('should return true for single credential:read scope', () => {
			const result = credentialsFinderService.hasGlobalReadOnlyAccess(['credential:read']);

			expect(result).toBe(true);
		});

		test('should return false for multiple scopes including credential:read', () => {
			const result = credentialsFinderService.hasGlobalReadOnlyAccess([
				'credential:read',
				'credential:update',
			]);

			expect(result).toBe(false);
		});

		test('should return false for single non-read scope', () => {
			const result = credentialsFinderService.hasGlobalReadOnlyAccess(['credential:update']);

			expect(result).toBe(false);
		});

		test('should return false for empty scopes array', () => {
			const result = credentialsFinderService.hasGlobalReadOnlyAccess([]);

			expect(result).toBe(false);
		});

		test('should return false for credential:delete scope', () => {
			const result = credentialsFinderService.hasGlobalReadOnlyAccess(['credential:delete']);

			expect(result).toBe(false);
		});

		test('should return false for credential:shareGlobally scope', () => {
			const result = credentialsFinderService.hasGlobalReadOnlyAccess(['credential:shareGlobally']);

			expect(result).toBe(false);
		});
	});

	describe('findGlobalCredentialById', () => {
		const credentialId = 'cred-123';
		const mockGlobalCredential = mock<CredentialsEntity>({
			id: credentialId,
			name: 'Global Test Credential',
			type: 'testApi',
			isGlobal: true,
		});

		test('should find global credential by ID without relations', async () => {
			credentialsRepository.findOne.mockResolvedValueOnce(mockGlobalCredential);

			const result = await credentialsFinderService.findGlobalCredentialById(credentialId);

			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: credentialId,
					isGlobal: true,
				},
				relations: undefined,
			});
			expect(result).toEqual(mockGlobalCredential);
		});

		test('should find global credential by ID with relations', async () => {
			const relations = { shared: { project: true as const } };
			credentialsRepository.findOne.mockResolvedValueOnce(mockGlobalCredential);

			const result = await credentialsFinderService.findGlobalCredentialById(
				credentialId,
				relations,
			);

			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: credentialId,
					isGlobal: true,
				},
				relations,
			});
			expect(result).toEqual(mockGlobalCredential);
		});

		test('should return null when global credential not found', async () => {
			credentialsRepository.findOne.mockResolvedValueOnce(null);

			const result = await credentialsFinderService.findGlobalCredentialById('non-existent-id');

			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: 'non-existent-id',
					isGlobal: true,
				},
				relations: undefined,
			});
			expect(result).toBeNull();
		});

		test('should only query for global credentials', async () => {
			credentialsRepository.findOne.mockResolvedValueOnce(null);

			await credentialsFinderService.findGlobalCredentialById(credentialId);

			expect(credentialsRepository.findOne).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						isGlobal: true,
					}),
				}),
			);
		});

		test('should handle repository errors', async () => {
			const error = new Error('Database connection failed');
			credentialsRepository.findOne.mockRejectedValueOnce(error);

			await expect(credentialsFinderService.findGlobalCredentialById(credentialId)).rejects.toThrow(
				'Database connection failed',
			);
		});
	});
});
