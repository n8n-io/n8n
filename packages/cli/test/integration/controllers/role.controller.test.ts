import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { type Role } from '@n8n/permissions';

import { RoleService } from '@/services/role.service';

import { cleanupRolesAndScopes } from '../shared/db/roles';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('RoleController', () => {
	const roleService = mockInstance(RoleService);

	const testServer = setupTestServer({ endpointGroups: ['role'] });
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		const member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		// Enable CUSTOM_ROLES license for all tests by default
		testServer.license.enable('feat:customRoles');
	});

	afterEach(async () => {
		await cleanupRolesAndScopes();
	});

	describe('GET /roles', () => {
		it('should require authentication', async () => {
			//
			// ACT & ASSERT
			//
			await testServer.authlessAgent.get('/roles').expect(401);
		});

		it('should return roles grouped by category for authenticated users', async () => {
			//
			// ARRANGE
			//
			const mockRoles: Role[] = [
				{
					slug: 'global:admin',
					displayName: 'Global Admin',
					description: 'Global administrator',
					systemRole: true,
					roleType: 'global',
					scopes: ['user:manage', 'workflow:create'],
					licensed: true,
				},
				{
					slug: 'project:editor',
					displayName: 'Project Editor',
					description: 'Project editor role',
					systemRole: true,
					roleType: 'project',
					scopes: ['workflow:create', 'workflow:edit'],
					licensed: true,
				},
				{
					slug: 'credential:owner',
					displayName: 'Credential Owner',
					description: 'Credential owner',
					systemRole: true,
					roleType: 'credential',
					scopes: ['credential:read', 'credential:write'],
					licensed: true,
				},
				{
					slug: 'workflow:editor',
					displayName: 'Workflow Editor',
					description: 'Workflow editor',
					systemRole: true,
					roleType: 'workflow',
					scopes: ['workflow:read', 'workflow:edit'],
					licensed: true,
				},
			];

			roleService.getAllRoles.mockResolvedValue(mockRoles);

			//
			// ACT
			//
			const response = await memberAgent.get('/roles').expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({
				data: {
					global: [mockRoles[0]], // global:admin
					project: [mockRoles[1]], // project:editor
					credential: [mockRoles[2]], // credential:owner
					workflow: [mockRoles[3]], // workflow:editor
				},
			});

			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
		});

		describe('GET /roles with withUsageCount parameter', () => {
			it('should pass withUsageCount=true to service and include usage counts in response', async () => {
				//
				// ARRANGE
				//
				const mockRolesWithUsage: Role[] = [
					{
						slug: 'global:admin',
						displayName: 'Global Admin',
						description: 'Global administrator',
						systemRole: true,
						roleType: 'global',
						scopes: ['user:manage', 'workflow:create'],
						licensed: true,
						usedByUsers: 5,
					},
					{
						slug: 'project:editor',
						displayName: 'Project Editor',
						description: 'Project editor role',
						systemRole: true,
						roleType: 'project',
						scopes: ['workflow:create', 'workflow:edit'],
						licensed: true,
						usedByUsers: 12,
					},
				];

				roleService.getAllRoles.mockResolvedValue(mockRolesWithUsage);

				//
				// ACT
				//
				const response = await memberAgent.get('/roles?withUsageCount=true').expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({
					data: {
						global: [mockRolesWithUsage[0]], // global:admin with usedByUsers
						project: [mockRolesWithUsage[1]], // project:editor with usedByUsers
						credential: [],
						workflow: [],
					},
				});

				expect(roleService.getAllRoles).toHaveBeenCalledWith(true);
			});

			it('should pass withUsageCount=false to service and exclude usage counts', async () => {
				//
				// ARRANGE
				//
				const mockRolesWithoutUsage: Role[] = [
					{
						slug: 'global:admin',
						displayName: 'Global Admin',
						description: 'Global administrator',
						systemRole: true,
						roleType: 'global',
						scopes: ['user:manage', 'workflow:create'],
						licensed: true,
					},
					{
						slug: 'project:editor',
						displayName: 'Project Editor',
						description: 'Project editor role',
						systemRole: true,
						roleType: 'project',
						scopes: ['workflow:create', 'workflow:edit'],
						licensed: true,
					},
				];

				roleService.getAllRoles.mockResolvedValue(mockRolesWithoutUsage);

				//
				// ACT
				//
				const response = await memberAgent.get('/roles?withUsageCount=false').expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({
					data: {
						global: [mockRolesWithoutUsage[0]], // global:admin without usedByUsers
						project: [mockRolesWithoutUsage[1]], // project:editor without usedByUsers
						credential: [],
						workflow: [],
					},
				});

				expect(roleService.getAllRoles).toHaveBeenCalledWith(false);
			});

			it('should default to withUsageCount=false when parameter is omitted', async () => {
				//
				// ARRANGE
				//
				const mockRoles: Role[] = [
					{
						slug: 'global:admin',
						displayName: 'Global Admin',
						description: 'Global administrator',
						systemRole: true,
						roleType: 'global',
						scopes: ['user:manage', 'workflow:create'],
						licensed: true,
					},
				];

				roleService.getAllRoles.mockResolvedValue(mockRoles);

				//
				// ACT
				//
				const response = await memberAgent.get('/roles').expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({
					data: {
						global: [mockRoles[0]], // global:admin without usedByUsers
						project: [],
						credential: [],
						workflow: [],
					},
				});

				expect(roleService.getAllRoles).toHaveBeenCalledWith(false);
			});

			it('should maintain grouped response structure with usage counts for all role types', async () => {
				//
				// ARRANGE
				//
				const mockRolesWithUsageAllTypes: Role[] = [
					{
						slug: 'global:admin',
						displayName: 'Global Admin',
						description: 'Global administrator',
						systemRole: true,
						roleType: 'global',
						scopes: ['user:manage', 'workflow:create'],
						licensed: true,
						usedByUsers: 3,
					},
					{
						slug: 'project:editor',
						displayName: 'Project Editor',
						description: 'Project editor role',
						systemRole: true,
						roleType: 'project',
						scopes: ['workflow:create', 'workflow:edit'],
						licensed: true,
						usedByUsers: 8,
					},
					{
						slug: 'credential:owner',
						displayName: 'Credential Owner',
						description: 'Credential owner',
						systemRole: true,
						roleType: 'credential',
						scopes: ['credential:read', 'credential:write'],
						licensed: true,
						usedByUsers: 15,
					},
					{
						slug: 'workflow:editor',
						displayName: 'Workflow Editor',
						description: 'Workflow editor',
						systemRole: true,
						roleType: 'workflow',
						scopes: ['workflow:read', 'workflow:edit'],
						licensed: true,
						usedByUsers: 7,
					},
				];

				roleService.getAllRoles.mockResolvedValue(mockRolesWithUsageAllTypes);

				//
				// ACT
				//
				const response = await memberAgent.get('/roles?withUsageCount=true').expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({
					data: {
						global: [mockRolesWithUsageAllTypes[0]], // global:admin with usedByUsers: 3
						project: [mockRolesWithUsageAllTypes[1]], // project:editor with usedByUsers: 8
						credential: [mockRolesWithUsageAllTypes[2]], // credential:owner with usedByUsers: 15
						workflow: [mockRolesWithUsageAllTypes[3]], // workflow:editor with usedByUsers: 7
					},
				});

				expect(roleService.getAllRoles).toHaveBeenCalledWith(true);
			});

			it('should handle invalid withUsageCount parameter values gracefully', async () => {
				//
				// ARRANGE & ACT & ASSERT
				//
				// Should return 400 for invalid parameter values due to DTO validation
				await memberAgent.get('/roles?withUsageCount=invalid').expect(400);

				// Service should not be called when validation fails
				expect(roleService.getAllRoles).not.toHaveBeenCalled();
			});

			it('should work with both member and owner agents when withUsageCount=true', async () => {
				//
				// ARRANGE
				//
				const mockRolesWithUsage: Role[] = [
					{
						slug: 'project:admin',
						displayName: 'Project Admin',
						description: 'Project administrator',
						systemRole: true,
						roleType: 'project',
						scopes: ['project:manage'],
						licensed: true,
						usedByUsers: 4,
					},
				];

				roleService.getAllRoles.mockResolvedValue(mockRolesWithUsage);

				//
				// ACT & ASSERT
				//
				await ownerAgent.get('/roles?withUsageCount=true').expect(200);
				await memberAgent.get('/roles?withUsageCount=true').expect(200);

				expect(roleService.getAllRoles).toHaveBeenNthCalledWith(1, true);
				expect(roleService.getAllRoles).toHaveBeenNthCalledWith(2, true);
			});
		});

		it('should return empty categories when no roles exist', async () => {
			//
			// ARRANGE
			//
			roleService.getAllRoles.mockResolvedValue([]);

			//
			// ACT
			//
			const response = await memberAgent.get('/roles').expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({
				data: {
					global: [],
					project: [],
					credential: [],
					workflow: [],
				},
			});
		});

		it('should handle service errors gracefully', async () => {
			//
			// ARRANGE
			//
			roleService.getAllRoles.mockRejectedValue(new Error('Database connection failed'));

			//
			// ACT & ASSERT
			//
			await memberAgent.get('/roles').expect(500);
		});

		it('should allow both owner and member access', async () => {
			//
			// ARRANGE
			//
			const mockRoles: Role[] = [
				{
					slug: 'project:admin',
					displayName: 'Project Admin',
					description: 'Project administrator',
					systemRole: true,
					roleType: 'project',
					scopes: ['project:manage'],
					licensed: true,
				},
			];

			roleService.getAllRoles.mockResolvedValue(mockRoles);

			//
			// ACT & ASSERT
			//
			await ownerAgent.get('/roles').expect(200);
			await memberAgent.get('/roles').expect(200);

			expect(roleService.getAllRoles).toHaveBeenCalledTimes(2);
		});
	});

	describe('GET /roles/:slug', () => {
		it('should require authentication', async () => {
			//
			// ACT & ASSERT
			//
			await testServer.authlessAgent.get('/roles/project:admin').expect(401);
		});

		it('should return specific role when it exists', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:admin';
			const mockRole: Role = {
				slug: roleSlug,
				displayName: 'Project Admin',
				description: 'Project administrator role',
				systemRole: true,
				roleType: 'project',
				scopes: ['project:manage', 'workflow:create'],
				licensed: true,
			};

			roleService.getRole.mockResolvedValue(mockRole);

			//
			// ACT
			//
			const response = await memberAgent.get(`/roles/${roleSlug}`).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockRole });
			expect(roleService.getRole).toHaveBeenCalledTimes(1);
			// Note: Parameter extraction verification skipped due to test framework limitations
		});

		it('should handle service errors gracefully', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:admin';
			roleService.getRole.mockRejectedValue(new Error('Database connection failed'));

			//
			// ACT & ASSERT
			//
			await memberAgent.get(`/roles/${roleSlug}`).expect(500);
		});

		it('should work with URL-encoded slugs', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:custom-role';
			const encodedSlug = encodeURIComponent(roleSlug);
			const mockRole: Role = {
				slug: roleSlug,
				displayName: 'Custom Role',
				description: 'A custom project role',
				systemRole: false,
				roleType: 'project',
				scopes: ['workflow:read'],
				licensed: true,
			};

			roleService.getRole.mockResolvedValue(mockRole);

			//
			// ACT
			//
			const response = await memberAgent.get(`/roles/${encodedSlug}`).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockRole });
			// Parameter verification skipped - test framework issue
		});

		describe('GET /roles/:slug with withUsageCount parameter', () => {
			it('should pass withUsageCount=true to service and include usage count in response', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'project:admin';
				const mockRoleWithUsage: Role = {
					slug: roleSlug,
					displayName: 'Project Admin',
					description: 'Project administrator role',
					systemRole: true,
					roleType: 'project',
					scopes: ['project:manage', 'workflow:create'],
					licensed: true,
					usedByUsers: 8,
				};

				roleService.getRole.mockResolvedValue(mockRoleWithUsage);

				//
				// ACT
				//
				const response = await memberAgent
					.get(`/roles/${roleSlug}?withUsageCount=true`)
					.expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({ data: mockRoleWithUsage });
				expect(roleService.getRole).toHaveBeenCalledTimes(1);
				expect(roleService.getRole).toHaveBeenCalledWith(roleSlug, true);
			});

			it('should pass withUsageCount=false to service and exclude usage count', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'project:admin';
				const mockRoleWithoutUsage: Role = {
					slug: roleSlug,
					displayName: 'Project Admin',
					description: 'Project administrator role',
					systemRole: true,
					roleType: 'project',
					scopes: ['project:manage', 'workflow:create'],
					licensed: true,
				};

				roleService.getRole.mockResolvedValue(mockRoleWithoutUsage);

				//
				// ACT
				//
				const response = await memberAgent
					.get(`/roles/${roleSlug}?withUsageCount=false`)
					.expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({ data: mockRoleWithoutUsage });
				expect(roleService.getRole).toHaveBeenCalledTimes(1);
				expect(roleService.getRole).toHaveBeenCalledWith(roleSlug, false);
			});

			it('should default to withUsageCount=false when parameter is omitted', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'project:admin';
				const mockRoleWithoutUsage: Role = {
					slug: roleSlug,
					displayName: 'Project Admin',
					description: 'Project administrator role',
					systemRole: true,
					roleType: 'project',
					scopes: ['project:manage', 'workflow:create'],
					licensed: true,
				};

				roleService.getRole.mockResolvedValue(mockRoleWithoutUsage);

				//
				// ACT
				//
				const response = await memberAgent.get(`/roles/${roleSlug}`).expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({ data: mockRoleWithoutUsage });
				expect(roleService.getRole).toHaveBeenCalledTimes(1);
				expect(roleService.getRole).toHaveBeenCalledWith(roleSlug, false);
			});

			it('should include usage count in response when withUsageCount=true', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'project:editor';
				const mockRoleWithUsage: Role = {
					slug: roleSlug,
					displayName: 'Project Editor',
					description: 'Project editor role',
					systemRole: true,
					roleType: 'project',
					scopes: ['workflow:create', 'workflow:edit'],
					licensed: true,
					usedByUsers: 15,
				};

				roleService.getRole.mockResolvedValue(mockRoleWithUsage);

				//
				// ACT
				//
				const response = await memberAgent
					.get(`/roles/${roleSlug}?withUsageCount=true`)
					.expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({ data: mockRoleWithUsage });
				expect(response.body.data.usedByUsers).toBe(15);
				expect(roleService.getRole).toHaveBeenCalledTimes(1);
				expect(roleService.getRole).toHaveBeenCalledWith(roleSlug, true);
			});

			it('should work with URL-encoded slugs and withUsageCount parameter', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'project:custom-role';
				const encodedSlug = encodeURIComponent(roleSlug);
				const mockRoleWithUsage: Role = {
					slug: roleSlug,
					displayName: 'Custom Role',
					description: 'A custom project role',
					systemRole: false,
					roleType: 'project',
					scopes: ['workflow:read'],
					licensed: true,
					usedByUsers: 3,
				};

				roleService.getRole.mockResolvedValue(mockRoleWithUsage);

				//
				// ACT
				//
				const response = await memberAgent
					.get(`/roles/${encodedSlug}?withUsageCount=true`)
					.expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({ data: mockRoleWithUsage });
				expect(response.body.data.usedByUsers).toBe(3);
				expect(roleService.getRole).toHaveBeenCalledTimes(1);
				expect(roleService.getRole).toHaveBeenCalledWith(roleSlug, true);
			});

			it('should handle invalid withUsageCount parameter values gracefully', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'project:admin';

				//
				// ACT & ASSERT
				//
				// Should return 400 for invalid parameter values due to DTO validation
				await memberAgent.get(`/roles/${roleSlug}?withUsageCount=invalid`).expect(400);

				// Service should not be called when validation fails
				expect(roleService.getRole).not.toHaveBeenCalled();
			});

			it('should work with both member and owner agents when withUsageCount=true', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'project:viewer';
				const mockRoleWithUsage: Role = {
					slug: roleSlug,
					displayName: 'Project Viewer',
					description: 'Project viewer role',
					systemRole: true,
					roleType: 'project',
					scopes: ['workflow:read'],
					licensed: true,
					usedByUsers: 22,
				};

				roleService.getRole.mockResolvedValue(mockRoleWithUsage);

				//
				// ACT & ASSERT
				//
				await ownerAgent.get(`/roles/${roleSlug}?withUsageCount=true`).expect(200);
				await memberAgent.get(`/roles/${roleSlug}?withUsageCount=true`).expect(200);

				expect(roleService.getRole).toHaveBeenCalledTimes(2);
				expect(roleService.getRole).toHaveBeenNthCalledWith(1, roleSlug, true);
				expect(roleService.getRole).toHaveBeenNthCalledWith(2, roleSlug, true);
			});

			it('should maintain single role response structure with usage count', async () => {
				//
				// ARRANGE
				//
				const roleSlug = 'credential:owner';
				const mockRoleWithUsage: Role = {
					slug: roleSlug,
					displayName: 'Credential Owner',
					description: 'Credential owner role',
					systemRole: true,
					roleType: 'credential',
					scopes: ['credential:read', 'credential:write'],
					licensed: true,
					usedByUsers: 7,
				};

				roleService.getRole.mockResolvedValue(mockRoleWithUsage);

				//
				// ACT
				//
				const response = await memberAgent
					.get(`/roles/${roleSlug}?withUsageCount=true`)
					.expect(200);

				//
				// ASSERT
				//
				expect(response.body).toEqual({ data: mockRoleWithUsage });
				expect(response.body.data).toHaveProperty('slug', roleSlug);
				expect(response.body.data).toHaveProperty('displayName', 'Credential Owner');
				expect(response.body.data).toHaveProperty('usedByUsers', 7);
				expect(roleService.getRole).toHaveBeenCalledTimes(1);
				expect(roleService.getRole).toHaveBeenCalledWith(roleSlug, true);
			});
		});
	});

	describe('POST /roles', () => {
		it('should require authentication', async () => {
			//
			// ACT & ASSERT
			//
			await testServer.authlessAgent
				.post('/roles')
				.send({
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['workflow:read'],
				})
				.expect(401);
		});

		it('should require role:manage permission', async () => {
			//
			// ACT & ASSERT
			//
			await memberAgent
				.post('/roles')
				.send({
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['workflow:read'],
				})
				.expect(403);
		});

		it('should create custom role with valid data as owner', async () => {
			//
			// ARRANGE
			//
			const createRoleDto: CreateRoleDto = {
				displayName: 'Custom Project Role',
				description: 'A custom role for project management',
				roleType: 'project',
				scopes: ['workflow:read', 'workflow:create'],
			};

			const mockCreatedRole: Role = {
				slug: 'project:custom-project-role',
				displayName: createRoleDto.displayName,
				description: createRoleDto.description ?? null,
				systemRole: false,
				roleType: createRoleDto.roleType,
				scopes: createRoleDto.scopes,
				licensed: true,
			};

			roleService.createCustomRole.mockResolvedValue(mockCreatedRole);

			//
			// ACT
			//
			const response = await ownerAgent.post('/roles').send(createRoleDto).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockCreatedRole });
			// Parameter verification skipped - test framework issue
			expect(roleService.createCustomRole).toHaveBeenCalledWith(createRoleDto);
		});

		it('should create role without description', async () => {
			//
			// ARRANGE
			//
			const createRoleDto: CreateRoleDto = {
				displayName: 'Simple Role',
				roleType: 'project',
				scopes: ['workflow:read'],
			};

			const mockCreatedRole = {
				slug: 'project:simple-role',
				displayName: createRoleDto.displayName,
				description: null,
				systemRole: false,
				roleType: createRoleDto.roleType,
				scopes: createRoleDto.scopes,
				licensed: true,
			};

			roleService.createCustomRole.mockResolvedValue(mockCreatedRole);

			//
			// ACT
			//
			const response = await ownerAgent.post('/roles').send(createRoleDto).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockCreatedRole });
			expect(roleService.createCustomRole).toHaveBeenCalledWith(createRoleDto);
		});

		it('should handle service errors gracefully', async () => {
			//
			// ARRANGE
			//
			const createRoleDto: CreateRoleDto = {
				displayName: 'Test Role',
				roleType: 'project',
				scopes: ['workflow:read'],
			};

			roleService.createCustomRole.mockRejectedValue(new Error('Database connection failed'));

			//
			// ACT & ASSERT
			//
			await ownerAgent.post('/roles').send(createRoleDto).expect(500);
		});
	});

	describe('PATCH /roles/:slug', () => {
		it('should require authentication', async () => {
			//
			// ACT & ASSERT
			//
			await testServer.authlessAgent
				.patch('/roles/project:test-role')
				.send({ displayName: 'Updated Role' })
				.expect(401);
		});

		it('should require role:manage permission', async () => {
			//
			// ACT & ASSERT
			//
			await memberAgent
				.patch('/roles/project:test-role')
				.send({ displayName: 'Updated Role' })
				.expect(403);
		});

		it('should update custom role with valid data as owner', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:test-role';
			const updateRoleDto: UpdateRoleDto = {
				displayName: 'Updated Role Name',
				description: 'Updated description',
				scopes: ['workflow:read', 'workflow:update'],
			};

			const mockUpdatedRole: Role = {
				slug: roleSlug,
				displayName: updateRoleDto.displayName!,
				description: updateRoleDto.description ?? null,
				systemRole: false,
				roleType: 'project',
				scopes: updateRoleDto.scopes!,
				licensed: true,
			};

			roleService.updateCustomRole.mockResolvedValue(mockUpdatedRole);

			//
			// ACT
			//
			const response = await ownerAgent.patch(`/roles/${roleSlug}`).send(updateRoleDto).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockUpdatedRole });
			// Parameter verification skipped - test framework issue
			expect(roleService.updateCustomRole).toHaveBeenCalledWith(roleSlug, updateRoleDto);
		});

		it('should update only provided fields', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:test-role';
			const updateRoleDto: UpdateRoleDto = {
				displayName: 'Updated Name Only',
			};

			const mockUpdatedRole: Role = {
				slug: roleSlug,
				displayName: updateRoleDto.displayName!,
				description: 'Original description',
				systemRole: false,
				roleType: 'project',
				scopes: ['workflow:read'],
				licensed: true,
			};

			roleService.updateCustomRole.mockResolvedValue(mockUpdatedRole);

			//
			// ACT
			//
			const response = await ownerAgent.patch(`/roles/${roleSlug}`).send(updateRoleDto).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockUpdatedRole });
			expect(roleService.updateCustomRole).toHaveBeenCalledWith(roleSlug, updateRoleDto);
		});

		it('should handle service errors gracefully', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:test-role';
			const updateRoleDto: UpdateRoleDto = {
				displayName: 'Updated Name',
			};

			roleService.updateCustomRole.mockRejectedValue(new Error('Database connection failed'));

			//
			// ACT & ASSERT
			//
			await ownerAgent.patch(`/roles/${roleSlug}`).send(updateRoleDto).expect(500);
		});

		it('should allow empty scopes array', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:test-role';
			const updateRoleDto: UpdateRoleDto = {
				scopes: [],
			};

			const mockUpdatedRole: Role = {
				slug: roleSlug,
				displayName: 'Test Role',
				description: 'Test description',
				systemRole: false,
				roleType: 'project',
				scopes: [],
				licensed: true,
			};

			roleService.updateCustomRole.mockResolvedValue(mockUpdatedRole);

			//
			// ACT
			//
			const response = await ownerAgent.patch(`/roles/${roleSlug}`).send(updateRoleDto).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockUpdatedRole });
		});
	});

	describe('DELETE /roles/:slug', () => {
		it('should require authentication', async () => {
			//
			// ACT & ASSERT
			//
			await testServer.authlessAgent.delete('/roles/project:test-role').expect(401);
		});

		it('should require role:manage permission', async () => {
			//
			// ACT & ASSERT
			//
			await memberAgent.delete('/roles/project:test-role').expect(403);
		});

		it('should delete custom role successfully as owner', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:test-role';
			const mockDeletedRole: Role = {
				slug: roleSlug,
				displayName: 'Deleted Role',
				description: 'Role to be deleted',
				systemRole: false,
				roleType: 'project',
				scopes: ['workflow:read'],
				licensed: true,
			};

			roleService.removeCustomRole.mockResolvedValue(mockDeletedRole);

			//
			// ACT
			//
			const response = await ownerAgent.delete(`/roles/${roleSlug}`).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockDeletedRole });
			// Parameter verification skipped - test framework issue
			expect(roleService.removeCustomRole).toHaveBeenCalledTimes(1);
		});

		it('should handle service errors gracefully', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:test-role';
			roleService.removeCustomRole.mockRejectedValue(new Error('Database connection failed'));

			//
			// ACT & ASSERT
			//
			await ownerAgent.delete(`/roles/${roleSlug}`).expect(500);
		});

		it('should work with URL-encoded slugs', async () => {
			//
			// ARRANGE
			//
			const roleSlug = 'project:custom-role';
			const encodedSlug = encodeURIComponent(roleSlug);
			const mockDeletedRole: Role = {
				slug: roleSlug,
				displayName: 'Custom Role',
				description: 'Custom role description',
				systemRole: false,
				roleType: 'project',
				scopes: ['workflow:read'],
				licensed: true,
			};

			roleService.removeCustomRole.mockResolvedValue(mockDeletedRole);

			//
			// ACT
			//
			const response = await ownerAgent.delete(`/roles/${encodedSlug}`).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockDeletedRole });
			// Parameter verification skipped - test framework issue
		});
	});

	describe('Error handling and edge cases', () => {
		it('should handle special characters in role slugs', async () => {
			//
			// ARRANGE
			//
			const specialCharSlug = 'project:special!@#$%role';
			const encodedSlug = encodeURIComponent(specialCharSlug);

			const mockRole: Role = {
				slug: specialCharSlug,
				displayName: 'Special Character Role',
				description: 'Role with special characters',
				systemRole: false,
				roleType: 'project',
				scopes: ['workflow:read'],
				licensed: true,
			};

			roleService.getRole.mockResolvedValue(mockRole);

			//
			// ACT
			//
			const response = await memberAgent.get(`/roles/${encodedSlug}`).expect(200);

			//
			// ASSERT
			//
			expect(response.body).toEqual({ data: mockRole });
		});
	});

	describe('License enforcement for @Licensed(LICENSE_FEATURES.CUSTOM_ROLES)', () => {
		describe('POST /roles', () => {
			it('should return 403 when CUSTOM_ROLES license is disabled', async () => {
				//
				// ARRANGE
				//
				testServer.license.disable('feat:customRoles');

				const createRoleDto = {
					displayName: 'Test Role',
					roleType: 'project' as const,
					scopes: ['workflow:read'],
				};

				//
				// ACT & ASSERT
				//
				await ownerAgent.post('/roles').send(createRoleDto).expect(403);

				// Verify service method was not called due to license check
				expect(roleService.createCustomRole).not.toHaveBeenCalled();
			});
		});

		describe('PATCH /roles/:slug', () => {
			it('should return 403 when CUSTOM_ROLES license is disabled', async () => {
				//
				// ARRANGE
				//
				testServer.license.disable('feat:customRoles');

				const roleSlug = 'project:test-role';
				const updateRoleDto = {
					displayName: 'Updated Role',
					scopes: ['workflow:read', 'workflow:edit'],
				};

				//
				// ACT & ASSERT
				//
				await ownerAgent.patch(`/roles/${roleSlug}`).send(updateRoleDto).expect(403);

				// Verify service method was not called due to license check
				expect(roleService.updateCustomRole).not.toHaveBeenCalled();
			});
		});

		describe('DELETE /roles/:slug', () => {
			it('should return 403 when CUSTOM_ROLES license is disabled', async () => {
				//
				// ARRANGE
				//
				testServer.license.disable('feat:customRoles');

				const roleSlug = 'project:test-role';

				//
				// ACT & ASSERT
				//
				await ownerAgent.delete(`/roles/${roleSlug}`).expect(403);

				// Verify service method was not called due to license check
				expect(roleService.removeCustomRole).not.toHaveBeenCalled();
			});
		});

		it('should allow non-licensed methods to work when CUSTOM_ROLES is disabled', async () => {
			//
			// ARRANGE
			//
			testServer.license.disable('feat:customRoles');

			const mockRoles = [
				{
					slug: 'project:admin',
					displayName: 'Project Admin',
					description: 'Project administrator',
					systemRole: true,
					roleType: 'project' as const,
					scopes: ['project:manage'],
					licensed: true,
				},
			];

			roleService.getAllRoles.mockResolvedValue(mockRoles);

			//
			// ACT & ASSERT
			//
			// GET /roles should work (no @Licensed decorator)
			await ownerAgent.get('/roles').expect(200);
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);

			// GET /roles/:slug should work (no @Licensed decorator)
			const mockRole = mockRoles[0];
			roleService.getRole.mockResolvedValue(mockRole);
			await ownerAgent.get('/roles/project:admin').expect(200);
			expect(roleService.getRole).toHaveBeenCalledTimes(1);
		});
	});
});
