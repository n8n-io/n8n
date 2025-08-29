import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import { testDb } from '@n8n/backend-test-utils';
import { RoleRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ALL_ROLES } from '@n8n/permissions';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { License } from '@/license';
import { RoleService } from '@/services/role.service';

import {
	createRole,
	createSystemRole,
	createCustomRoleWithScopes,
	createTestScopes,
	cleanupRolesAndScopes,
} from '../shared/db/roles';
import { createMember } from '../shared/db/users';

let roleService: RoleService;
let roleRepository: RoleRepository;
let license: License;

const ALL_ROLES_SET = ALL_ROLES.global.concat(
	ALL_ROLES.project,
	ALL_ROLES.credential,
	ALL_ROLES.workflow,
);

beforeAll(async () => {
	await testDb.init();

	roleService = Container.get(RoleService);
	roleRepository = Container.get(RoleRepository);
	license = Container.get(License);
});

afterAll(async () => {
	await testDb.terminate();
});

afterEach(async () => {
	await cleanupRolesAndScopes();
	await testDb.truncate(['User']);
});

describe('RoleService', () => {
	describe('getAllRoles', () => {
		it('should return all roles with licensing information', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const customRole = await createCustomRoleWithScopes(
				[testScopes.readScope, testScopes.writeScope],
				{
					displayName: 'Custom Test Role',
					description: 'A custom role for testing',
				},
			);
			const systemRole = await createSystemRole({
				displayName: 'System Test Role',
			});

			//
			// ACT
			//
			const roles = await roleService.getAllRoles();

			//
			// ASSERT
			//
			expect(roles).toBeDefined();
			expect(Array.isArray(roles)).toBe(true);
			expect(roles.length).toBeGreaterThanOrEqual(2);

			// Find our test roles
			const returnedCustomRole = roles.find((r) => r.slug === customRole.slug);
			const returnedSystemRole = roles.find((r) => r.slug === systemRole.slug);

			expect(returnedCustomRole).toBeDefined();
			expect(returnedSystemRole).toBeDefined();

			// Verify role structure
			expect(returnedCustomRole).toMatchObject({
				slug: customRole.slug,
				displayName: customRole.displayName,
				description: customRole.description,
				systemRole: false,
				roleType: customRole.roleType,
				scopes: expect.any(Array),
				licensed: expect.any(Boolean),
			});

			// Verify scopes are converted to slugs
			expect(returnedCustomRole?.scopes).toEqual(
				expect.arrayContaining([testScopes.readScope.slug, testScopes.writeScope.slug]),
			);
		});

		it('should return built-in system roles when no custom roles exist', async () => {
			//
			// ARRANGE
			// (only built-in system roles exist in database)

			//
			// ACT
			//
			const roles = await roleService.getAllRoles();

			//
			// ASSERT
			//
			expect(roles).toBeDefined();
			expect(Array.isArray(roles)).toBe(true);
			expect(roles.length).toBeGreaterThan(0);

			// Verify all returned roles have proper structure
			roles.forEach((role) => {
				expect(role).toHaveProperty('slug');
				expect(role).toHaveProperty('displayName');
				expect(role).toHaveProperty('systemRole');
				expect(role.systemRole).toBe(true);
				expect(role).toHaveProperty('roleType');
				expect(role).toHaveProperty('scopes');
				expect(role).toHaveProperty('licensed');
				expect(Array.isArray(role.scopes)).toBe(true);
				expect(typeof role.licensed).toBe('boolean');
				expect(ALL_ROLES_SET.some((r) => r.slug === role.slug)).toBe(true);
			});
		});
	});

	describe('getRole', () => {
		it('should return role with licensing information when role exists', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const role = await createCustomRoleWithScopes([testScopes.adminScope], {
				displayName: 'Admin Role',
				description: 'Administrator role',
			});

			//
			// ACT
			//
			const result = await roleService.getRole(role.slug);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: role.slug,
				displayName: role.displayName,
				description: role.description,
				systemRole: false,
				roleType: role.roleType,
				scopes: [testScopes.adminScope.slug],
				licensed: expect.any(Boolean),
			});
		});

		it('should throw NotFoundError when role does not exist', async () => {
			//
			// ARRANGE
			//
			const nonExistentSlug = 'non-existent-role';

			//
			// ACT & ASSERT
			//
			await expect(roleService.getRole(nonExistentSlug)).rejects.toThrow(NotFoundError);
			await expect(roleService.getRole(nonExistentSlug)).rejects.toThrow('Role not found');
		});
	});

	describe('createCustomRole', () => {
		it('should create custom role with valid data', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const createRoleDto: CreateRoleDto = {
				displayName: 'Test Custom Role',
				description: 'A test custom role',
				roleType: 'project',
				scopes: [testScopes.readScope.slug, testScopes.writeScope.slug],
			};

			//
			// ACT
			//
			const result = await roleService.createCustomRole(createRoleDto);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				displayName: createRoleDto.displayName,
				description: createRoleDto.description,
				systemRole: false,
				roleType: createRoleDto.roleType,
				scopes: expect.arrayContaining(createRoleDto.scopes),
				licensed: expect.any(Boolean),
			});

			// Verify slug was generated correctly
			expect(result.slug).toMatch(/^project:test-custom-role-[a-z0-9]{6}$/);

			// Verify role was saved to database
			const savedRole = await roleRepository.findBySlug(result.slug);
			expect(savedRole).toBeDefined();
			expect(savedRole?.displayName).toBe(createRoleDto.displayName);
		});

		it('should create custom role without description', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const createRoleDto: CreateRoleDto = {
				displayName: 'No Description Role',
				roleType: 'project',
				scopes: [testScopes.readScope.slug],
			};

			//
			// ACT
			//
			const result = await roleService.createCustomRole(createRoleDto);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				displayName: createRoleDto.displayName,
				description: null,
				systemRole: false,
				roleType: createRoleDto.roleType,
				scopes: createRoleDto.scopes,
			});
		});

		it('should throw BadRequestError when scopes are undefined', async () => {
			//
			// ARRANGE
			//
			const createRoleDto = {
				displayName: 'Invalid Role',
				roleType: 'project' as const,
				scopes: undefined as any,
			};

			//
			// ACT & ASSERT
			//
			await expect(roleService.createCustomRole(createRoleDto)).rejects.toThrow(BadRequestError);
			await expect(roleService.createCustomRole(createRoleDto)).rejects.toThrow(
				'Scopes are required',
			);
		});

		it('should throw error when invalid scopes are provided', async () => {
			//
			// ARRANGE
			//
			const createRoleDto: CreateRoleDto = {
				displayName: 'Invalid Scopes Role',
				roleType: 'project',
				scopes: ['invalid:scope', 'another:invalid:scope'],
			};

			//
			// ACT & ASSERT
			//
			await expect(roleService.createCustomRole(createRoleDto)).rejects.toThrow(
				'The following scopes are invalid: invalid:scope, another:invalid:scope',
			);
		});

		it('should generate slug correctly for complex display names', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const createRoleDto: CreateRoleDto = {
				displayName: 'Complex Role Name With Spaces & Special Characters!',
				roleType: 'project',
				scopes: [testScopes.readScope.slug],
			};

			//
			// ACT
			//
			const result = await roleService.createCustomRole(createRoleDto);

			//
			// ASSERT
			//
			// The actual implementation uses a specific slug generation pattern
			expect(result.slug).toMatch(/^project:.+/);
			expect(result.slug).toContain('complex');
			expect(result.slug).toContain('role');
			expect(result.slug).toContain('name');
		});
	});

	describe('updateCustomRole', () => {
		it('should update custom role with valid data', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const existingRole = await createCustomRoleWithScopes([testScopes.readScope], {
				displayName: 'Original Role',
				description: 'Original description',
			});

			const updateRoleDto: UpdateRoleDto = {
				displayName: 'Updated Role',
				description: 'Updated description',
				scopes: [testScopes.writeScope.slug, testScopes.deleteScope.slug],
			};

			//
			// ACT
			//
			const result = await roleService.updateCustomRole(existingRole.slug, updateRoleDto);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: existingRole.slug,
				displayName: updateRoleDto.displayName,
				description: updateRoleDto.description,
				scopes: expect.arrayContaining(updateRoleDto.scopes as string[]),
			});

			// Verify database was updated
			const updatedRole = await roleRepository.findBySlug(existingRole.slug);
			expect(updatedRole?.displayName).toBe(updateRoleDto.displayName);
			expect(updatedRole?.description).toBe(updateRoleDto.description);
		});

		it('should update displayName when provided', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const existingRole = await createCustomRoleWithScopes([testScopes.readScope], {
				displayName: 'Original Role',
				description: 'Original description',
			});

			const updateRoleDto: UpdateRoleDto = {
				displayName: 'Updated Name Only',
			};

			//
			// ACT
			//
			const result = await roleService.updateCustomRole(existingRole.slug, updateRoleDto);

			//
			// ASSERT
			//
			expect(result.displayName).toBe(updateRoleDto.displayName);
		});

		it('should update role with empty scopes array', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const existingRole = await createCustomRoleWithScopes([
				testScopes.readScope,
				testScopes.writeScope,
			]);

			const updateRoleDto: UpdateRoleDto = {
				scopes: [],
			};

			//
			// ACT
			//
			const result = await roleService.updateCustomRole(existingRole.slug, updateRoleDto);

			//
			// ASSERT
			//
			expect(result.scopes).toEqual([]);
		});

		it('should throw error when role does not exist', async () => {
			//
			// ARRANGE
			//
			const nonExistentSlug = 'non-existent-role';
			const updateRoleDto: UpdateRoleDto = {
				displayName: 'Updated Name',
			};

			//
			// ACT & ASSERT
			//
			await expect(roleService.updateCustomRole(nonExistentSlug, updateRoleDto)).rejects.toThrow(
				'Role not found',
			);
		});

		it('should throw error when invalid scopes are provided', async () => {
			//
			// ARRANGE
			//
			const existingRole = await createRole();
			const updateRoleDto: UpdateRoleDto = {
				scopes: ['invalid:scope'],
			};

			//
			// ACT & ASSERT
			//
			await expect(roleService.updateCustomRole(existingRole.slug, updateRoleDto)).rejects.toThrow(
				'The following scopes are invalid: invalid:scope',
			);
		});
	});

	describe('removeCustomRole', () => {
		it('should remove custom role successfully', async () => {
			//
			// ARRANGE
			//
			const customRole = await createRole({
				displayName: 'Role to Delete',
				systemRole: false,
			});

			//
			// ACT
			//
			const result = await roleService.removeCustomRole(customRole.slug);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: customRole.slug,
				displayName: customRole.displayName,
				systemRole: false,
			});

			// Verify role was deleted from database
			const deletedRole = await roleRepository.findBySlug(customRole.slug);
			expect(deletedRole).toBeNull();
		});

		it('should throw NotFoundError when role does not exist', async () => {
			//
			// ARRANGE
			//
			const nonExistentSlug = 'non-existent-role';

			//
			// ACT & ASSERT
			//
			await expect(roleService.removeCustomRole(nonExistentSlug)).rejects.toThrow(NotFoundError);
			await expect(roleService.removeCustomRole(nonExistentSlug)).rejects.toThrow('Role not found');
		});

		it('should throw BadRequestError when trying to delete system role', async () => {
			//
			// ARRANGE
			//
			const systemRole = await createSystemRole({
				displayName: 'System Role',
			});

			//
			// ACT & ASSERT
			//
			await expect(roleService.removeCustomRole(systemRole.slug)).rejects.toThrow(BadRequestError);
			await expect(roleService.removeCustomRole(systemRole.slug)).rejects.toThrow(
				'Cannot delete system roles',
			);

			// Verify system role still exists
			const stillExistsRole = await roleRepository.findBySlug(systemRole.slug);
			expect(stillExistsRole).toBeDefined();
		});
	});

	describe('isRoleLicensed', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it.each([
			{ role: 'project:admin', licenseMethod: 'isProjectRoleAdminLicensed' },
			{ role: 'project:editor', licenseMethod: 'isProjectRoleEditorLicensed' },
			{ role: 'project:viewer', licenseMethod: 'isProjectRoleViewerLicensed' },
			{ role: 'global:admin', licenseMethod: 'isAdvancedPermissionsLicensed' },
		] as const)('should check license for built-in role $role', async ({ role, licenseMethod }) => {
			//
			// ARRANGE
			//
			const mockLicenseResult = Math.random() > 0.5; // Random boolean
			jest.spyOn(license, licenseMethod).mockReturnValue(mockLicenseResult);

			//
			// ACT
			//
			const result = roleService.isRoleLicensed(role);

			//
			// ASSERT
			//
			expect(result).toBe(mockLicenseResult);
			expect(license[licenseMethod]).toHaveBeenCalledTimes(1);
		});

		it('should return true for custom roles', async () => {
			//
			// ARRANGE
			//
			const customRoleSlug = 'custom:test-role';

			//
			// ACT
			//
			const result = roleService.isRoleLicensed(customRoleSlug as any);

			//
			// ASSERT
			//
			expect(result).toBe(true);
		});

		it('should return true for unknown role types', async () => {
			//
			// ARRANGE
			//
			const unknownRole = 'unknown:role' as any;

			//
			// ACT
			//
			const result = roleService.isRoleLicensed(unknownRole);

			//
			// ASSERT
			//
			expect(result).toBe(true);
		});
	});

	describe('addScopes', () => {
		it('should add scopes to workflow entity', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const mockWorkflow = {
				id: 'workflow-1',
				name: 'Test Workflow',
				active: true,
				shared: [
					{
						projectId: 'project-1',
						role: 'workflow:owner',
					},
				],
			} as any;
			const userProjectRelations = [] as any[];

			//
			// ACT
			//
			const result = roleService.addScopes(mockWorkflow, user, userProjectRelations);

			//
			// ASSERT
			//
			expect(result).toHaveProperty('scopes');
			expect(Array.isArray(result.scopes)).toBe(true);
		});

		it('should add scopes to credential entity', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const mockCredential = {
				id: 'cred-1',
				name: 'Test Credential',
				type: 'testCredential',
				shared: [
					{
						projectId: 'project-1',
						role: 'credential:owner',
					},
				],
			} as any;
			const userProjectRelations = [] as any[];

			//
			// ACT
			//
			const result = roleService.addScopes(mockCredential, user, userProjectRelations);

			//
			// ASSERT
			//
			expect(result).toHaveProperty('scopes');
			expect(Array.isArray(result.scopes)).toBe(true);
		});

		it('should return empty scopes when shared is undefined', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const mockEntity = {
				id: 'entity-1',
				name: 'Test Entity',
				active: true,
				shared: undefined,
			} as any;
			const userProjectRelations = [] as any[];

			//
			// ACT
			//
			const result = roleService.addScopes(mockEntity, user, userProjectRelations);

			//
			// ASSERT
			//
			expect(result.scopes).toEqual([]);
		});

		it('should throw UnexpectedError when entity type cannot be detected', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const mockEntity = {
				id: 'entity-1',
				name: 'Test Entity',
				// Missing both 'active' and 'type' properties
				shared: [],
			} as any;
			const userProjectRelations = [] as any[];

			//
			// ACT & ASSERT
			//
			expect(() => {
				roleService.addScopes(mockEntity, user, userProjectRelations);
			}).toThrow('Cannot detect if entity is a workflow or credential.');
		});
	});
});
