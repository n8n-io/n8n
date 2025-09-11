import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
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
let licenseState: LicenseState;

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
	licenseState = Container.get(LicenseState);
	licenseState.setLicenseProvider(license);
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

	describe('getAllRoles with usage counting', () => {
		it('should return roles without usage counts when withCount=false', async () => {
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

			const mockfindAllRoleCounts = jest.spyOn(roleRepository, 'findAllRoleCounts');

			//
			// ACT
			//
			const roles = await roleService.getAllRoles(false);

			//
			// ASSERT
			//
			expect(roles).toBeDefined();
			expect(Array.isArray(roles)).toBe(true);

			// Find our test roles
			const returnedCustomRole = roles.find((r) => r.slug === customRole.slug);
			const returnedSystemRole = roles.find((r) => r.slug === systemRole.slug);

			expect(returnedCustomRole).toBeDefined();
			expect(returnedSystemRole).toBeDefined();

			// Verify usedByUsers is undefined when withCount=false
			expect(returnedCustomRole?.usedByUsers).toBeUndefined();
			expect(returnedSystemRole?.usedByUsers).toBeUndefined();

			expect(mockfindAllRoleCounts).not.toHaveBeenCalled();
			mockfindAllRoleCounts.mockRestore();

			// Verify other properties are correct
			expect(returnedCustomRole).toMatchObject({
				slug: customRole.slug,
				displayName: customRole.displayName,
				description: customRole.description,
				systemRole: false,
				roleType: customRole.roleType,
				scopes: expect.any(Array),
				licensed: expect.any(Boolean),
			});
		});

		it('should return roles with usage counts when withCount=true', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const customRole = await createCustomRoleWithScopes(
				[testScopes.readScope, testScopes.writeScope],
				{
					displayName: 'Custom Role With Usage',
					description: 'A custom role for usage testing',
				},
			);
			const systemRole = await createSystemRole({
				displayName: 'System Role With Usage',
			});

			// Mock roleRepository.findAllRoleCounts to return predictable usage counts
			const mockfindAllRoleCounts = jest.spyOn(roleRepository, 'findAllRoleCounts');
			mockfindAllRoleCounts.mockResolvedValue({
				[customRole.slug]: 3,
				[systemRole.slug]: 1,
			});

			//
			// ACT
			//
			const roles = await roleService.getAllRoles(true);

			//
			// ASSERT
			//
			expect(roles).toBeDefined();
			expect(Array.isArray(roles)).toBe(true);

			// Find our test roles
			const returnedCustomRole = roles.find((r) => r.slug === customRole.slug);
			const returnedSystemRole = roles.find((r) => r.slug === systemRole.slug);

			expect(returnedCustomRole).toBeDefined();
			expect(returnedSystemRole).toBeDefined();

			// Verify usedByUsers is included when withCount=true
			expect(returnedCustomRole?.usedByUsers).toBe(3);
			expect(returnedSystemRole?.usedByUsers).toBe(1);

			// Verify other properties are preserved
			expect(returnedCustomRole).toMatchObject({
				slug: customRole.slug,
				displayName: customRole.displayName,
				description: customRole.description,
				systemRole: false,
				roleType: customRole.roleType,
				scopes: expect.any(Array),
				licensed: expect.any(Boolean),
			});

			// Verify findAllRoleCounts was called only once
			expect(mockfindAllRoleCounts).toBeCalledTimes(1);

			mockfindAllRoleCounts.mockRestore();
		});

		it('should return roles with zero usage count', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const unusedRole = await createCustomRoleWithScopes([testScopes.readScope], {
				displayName: 'Unused Role',
				description: 'A role with no users',
			});

			// Mock roleRepository.findAllRoleCounts to return 0 for all roles
			const mockfindAllRoleCounts = jest.spyOn(roleRepository, 'findAllRoleCounts');
			mockfindAllRoleCounts.mockResolvedValue({ [unusedRole.slug]: 0 });

			//
			// ACT
			//
			const roles = await roleService.getAllRoles(true);

			//
			// ASSERT
			//
			const returnedRole = roles.find((r) => r.slug === unusedRole.slug);

			expect(returnedRole).toBeDefined();
			expect(returnedRole?.usedByUsers).toBe(0);

			mockfindAllRoleCounts.mockRestore();
		});

		it('should handle mixed system and custom roles with different usage counts', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const customRole1 = await createCustomRoleWithScopes([testScopes.readScope], {
				displayName: 'Custom Role 1',
			});
			const customRole2 = await createCustomRoleWithScopes([testScopes.writeScope], {
				displayName: 'Custom Role 2',
			});
			const systemRole = await createSystemRole({
				displayName: 'System Role',
			});

			// Mock different usage counts for each role
			const mockfindAllRoleCounts = jest.spyOn(roleRepository, 'findAllRoleCounts');
			mockfindAllRoleCounts.mockResolvedValue({
				[customRole1.slug]: 5,
				[customRole2.slug]: 2,
				[systemRole.slug]: 10,
			});

			//
			// ACT
			//
			const roles = await roleService.getAllRoles(true);

			//
			// ASSERT
			//
			const returnedCustomRole1 = roles.find((r) => r.slug === customRole1.slug);
			const returnedCustomRole2 = roles.find((r) => r.slug === customRole2.slug);
			const returnedSystemRole = roles.find((r) => r.slug === systemRole.slug);

			expect(returnedCustomRole1?.usedByUsers).toBe(5);
			expect(returnedCustomRole2?.usedByUsers).toBe(2);
			expect(returnedSystemRole?.usedByUsers).toBe(10);

			// Verify role types are preserved
			expect(returnedCustomRole1?.systemRole).toBe(false);
			expect(returnedCustomRole2?.systemRole).toBe(false);
			expect(returnedSystemRole?.systemRole).toBe(true);

			expect(mockfindAllRoleCounts).toHaveBeenCalledTimes(1);
			mockfindAllRoleCounts.mockRestore();
		});

		it('should preserve complete role structure when adding usage counts', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const fullRole = await createCustomRoleWithScopes(
				[testScopes.readScope, testScopes.writeScope, testScopes.deleteScope],
				{
					displayName: 'Complete Role',
					description: 'A role with full properties',
				},
			);

			// Mock usage count
			const mockfindAllRoleCounts = jest.spyOn(roleRepository, 'findAllRoleCounts');
			mockfindAllRoleCounts.mockResolvedValue({
				[fullRole.slug]: 7,
			});

			//
			// ACT
			//
			const roles = await roleService.getAllRoles(true);

			//
			// ASSERT
			//
			const returnedRole = roles.find((r) => r.slug === fullRole.slug);

			expect(returnedRole).toBeDefined();
			expect(returnedRole).toMatchObject({
				slug: fullRole.slug,
				displayName: fullRole.displayName,
				description: fullRole.description,
				systemRole: false,
				roleType: fullRole.roleType,
				scopes: expect.arrayContaining([
					testScopes.readScope.slug,
					testScopes.writeScope.slug,
					testScopes.deleteScope.slug,
				]),
				licensed: expect.any(Boolean),
				usedByUsers: 7,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});

			// Verify all scopes are correctly converted to slugs
			expect(returnedRole?.scopes).toHaveLength(3);

			mockfindAllRoleCounts.mockRestore();
		});

		it('should verify repository findAllRoleCounts is called correctly', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const role1 = await createCustomRoleWithScopes([testScopes.readScope]);
			const role2 = await createSystemRole();

			const mockfindAllRoleCounts = jest.spyOn(roleRepository, 'findAllRoleCounts');
			mockfindAllRoleCounts.mockResolvedValue({
				[role1.slug]: 4,
				[role2.slug]: 6,
			});

			//
			// ACT
			//
			await roleService.getAllRoles(true);

			//
			// ASSERT
			//
			// Verify findAllRoleCounts was called only once
			expect(mockfindAllRoleCounts).toHaveBeenCalledTimes(1);

			mockfindAllRoleCounts.mockRestore();
		});

		it('should not call findAllRoleCounts when withCount=false', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			await createCustomRoleWithScopes([testScopes.readScope]);

			const mockfindAllRoleCounts = jest.spyOn(roleRepository, 'findAllRoleCounts');

			//
			// ACT
			//
			await roleService.getAllRoles(false);

			//
			// ASSERT
			//
			// Verify findAllRoleCounts was never called
			expect(mockfindAllRoleCounts).not.toHaveBeenCalled();

			mockfindAllRoleCounts.mockRestore();
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

	describe('getRole with usage counting', () => {
		it('should return role without usage count when withCount=false', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const customRole = await createCustomRoleWithScopes(
				[testScopes.readScope, testScopes.writeScope],
				{
					displayName: 'Custom Test Role',
					description: 'A custom role for testing without usage count',
				},
			);

			//
			// ACT
			//
			const result = await roleService.getRole(customRole.slug, false);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: customRole.slug,
				displayName: customRole.displayName,
				description: customRole.description,
				systemRole: false,
				roleType: customRole.roleType,
				scopes: expect.arrayContaining([testScopes.readScope.slug, testScopes.writeScope.slug]),
				licensed: expect.any(Boolean),
			});

			// Verify usedByUsers is undefined when withCount=false
			expect(result.usedByUsers).toBeUndefined();
		});

		it('should return role with accurate usage count when withCount=true', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const customRole = await createCustomRoleWithScopes([testScopes.adminScope], {
				displayName: 'Role With Usage Count',
				description: 'A custom role for usage counting testing',
			});

			// Mock roleRepository.countUsersWithRole to return predictable count
			const mockCountUsersWithRole = jest.spyOn(roleRepository, 'countUsersWithRole');
			mockCountUsersWithRole.mockResolvedValue(5);

			//
			// ACT
			//
			const result = await roleService.getRole(customRole.slug, true);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: customRole.slug,
				displayName: customRole.displayName,
				description: customRole.description,
				systemRole: false,
				roleType: customRole.roleType,
				scopes: expect.arrayContaining([testScopes.adminScope.slug]),
				licensed: expect.any(Boolean),
				usedByUsers: 5,
			});

			// Verify countUsersWithRole was called with the correct role
			expect(mockCountUsersWithRole).toHaveBeenCalledWith(
				expect.objectContaining({ slug: customRole.slug }),
			);

			mockCountUsersWithRole.mockRestore();
		});

		it('should throw NotFoundError regardless of withCount parameter', async () => {
			//
			// ARRANGE
			//
			const nonExistentSlug = 'non-existent-role-for-usage-test';

			//
			// ACT & ASSERT
			//
			await expect(roleService.getRole(nonExistentSlug, false)).rejects.toThrow(NotFoundError);
			await expect(roleService.getRole(nonExistentSlug, false)).rejects.toThrow('Role not found');

			await expect(roleService.getRole(nonExistentSlug, true)).rejects.toThrow(NotFoundError);
			await expect(roleService.getRole(nonExistentSlug, true)).rejects.toThrow('Role not found');
		});

		it('should work with system roles and usage counting', async () => {
			//
			// ARRANGE
			//
			const systemRole = await createSystemRole({
				displayName: 'System Role With Usage',
				description: 'A system role for usage testing',
			});

			// Mock higher usage count for system role
			const mockCountUsersWithRole = jest.spyOn(roleRepository, 'countUsersWithRole');
			mockCountUsersWithRole.mockResolvedValue(12);

			//
			// ACT
			//
			const result = await roleService.getRole(systemRole.slug, true);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: systemRole.slug,
				displayName: systemRole.displayName,
				description: systemRole.description,
				systemRole: true,
				roleType: systemRole.roleType,
				scopes: expect.any(Array),
				licensed: expect.any(Boolean),
				usedByUsers: 12,
			});

			// Verify system role properties are preserved
			expect(result.systemRole).toBe(true);

			mockCountUsersWithRole.mockRestore();
		});

		it('should return role with zero usage count', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const unusedRole = await createCustomRoleWithScopes([testScopes.readScope], {
				displayName: 'Unused Role',
				description: 'A role with no assigned users',
			});

			// Mock countUsersWithRole to return 0
			const mockCountUsersWithRole = jest.spyOn(roleRepository, 'countUsersWithRole');
			mockCountUsersWithRole.mockResolvedValue(0);

			//
			// ACT
			//
			const result = await roleService.getRole(unusedRole.slug, true);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: unusedRole.slug,
				displayName: unusedRole.displayName,
				description: unusedRole.description,
				systemRole: false,
				roleType: unusedRole.roleType,
				scopes: expect.arrayContaining([testScopes.readScope.slug]),
				licensed: expect.any(Boolean),
				usedByUsers: 0,
			});

			mockCountUsersWithRole.mockRestore();
		});

		it('should preserve complete role structure with usage count', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const fullRole = await createCustomRoleWithScopes(
				[testScopes.readScope, testScopes.writeScope, testScopes.deleteScope],
				{
					displayName: 'Complete Role Structure',
					description: 'A role with full properties for structure verification',
				},
			);

			// Mock usage count
			const mockCountUsersWithRole = jest.spyOn(roleRepository, 'countUsersWithRole');
			mockCountUsersWithRole.mockResolvedValue(8);

			//
			// ACT
			//
			const result = await roleService.getRole(fullRole.slug, true);

			//
			// ASSERT
			//
			expect(result).toMatchObject({
				slug: fullRole.slug,
				displayName: fullRole.displayName,
				description: fullRole.description,
				systemRole: false,
				roleType: fullRole.roleType,
				scopes: expect.arrayContaining([
					testScopes.readScope.slug,
					testScopes.writeScope.slug,
					testScopes.deleteScope.slug,
				]),
				licensed: expect.any(Boolean),
				usedByUsers: 8,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});

			// Verify all scopes are included
			expect(result.scopes).toHaveLength(3);

			mockCountUsersWithRole.mockRestore();
		});

		it('should verify countUsersWithRole is called only when withCount=true', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const testRole = await createCustomRoleWithScopes([testScopes.readScope]);

			const mockCountUsersWithRole = jest.spyOn(roleRepository, 'countUsersWithRole');
			mockCountUsersWithRole.mockResolvedValue(3);

			//
			// ACT
			//
			// Test with withCount=false
			await roleService.getRole(testRole.slug, false);

			// Test with withCount=true
			await roleService.getRole(testRole.slug, true);

			//
			// ASSERT
			//
			// Verify countUsersWithRole was called only once (for withCount=true)
			expect(mockCountUsersWithRole).toHaveBeenCalledTimes(1);
			expect(mockCountUsersWithRole).toHaveBeenCalledWith(
				expect.objectContaining({ slug: testRole.slug }),
			);

			mockCountUsersWithRole.mockRestore();
		});

		it('should verify repository integration with different usage counts', async () => {
			//
			// ARRANGE
			//
			const testScopes = await createTestScopes();
			const role1 = await createCustomRoleWithScopes([testScopes.readScope], {
				displayName: 'Role One',
			});
			const role2 = await createCustomRoleWithScopes([testScopes.writeScope], {
				displayName: 'Role Two',
			});

			// Mock different usage counts for different roles
			const mockCountUsersWithRole = jest.spyOn(roleRepository, 'countUsersWithRole');
			mockCountUsersWithRole.mockImplementation(async (role) => {
				if (role.slug === role1.slug) return 15;
				if (role.slug === role2.slug) return 3;
				return 0;
			});

			//
			// ACT
			//
			const result1 = await roleService.getRole(role1.slug, true);
			const result2 = await roleService.getRole(role2.slug, true);

			//
			// ASSERT
			//
			expect(result1.usedByUsers).toBe(15);
			expect(result2.usedByUsers).toBe(3);

			// Verify each role was queried correctly
			expect(mockCountUsersWithRole).toHaveBeenCalledTimes(2);
			expect(mockCountUsersWithRole).toHaveBeenCalledWith(
				expect.objectContaining({ slug: role1.slug }),
			);
			expect(mockCountUsersWithRole).toHaveBeenCalledWith(
				expect.objectContaining({ slug: role2.slug }),
			);

			mockCountUsersWithRole.mockRestore();
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
		] as const)(
			'should pass license check for built-in role $role',
			async ({ role, licenseMethod }) => {
				//
				// ARRANGE
				//
				const mockLicenseResult = true;
				jest.spyOn(licenseState, licenseMethod).mockReturnValue(mockLicenseResult);

				//
				// ACT
				//
				const result = roleService.isRoleLicensed(role);

				//
				// ASSERT
				//
				expect(result).toBe(mockLicenseResult);
				expect(licenseState[licenseMethod]).toHaveBeenCalledTimes(1);
			},
		);

		it.each([
			{ role: 'project:admin', licenseMethod: 'isProjectRoleAdminLicensed' },
			{ role: 'project:editor', licenseMethod: 'isProjectRoleEditorLicensed' },
			{ role: 'project:viewer', licenseMethod: 'isProjectRoleViewerLicensed' },
			{ role: 'global:admin', licenseMethod: 'isAdvancedPermissionsLicensed' },
		] as const)(
			'should fail license state check for built-in role $role',
			async ({ role, licenseMethod }) => {
				//
				// ARRANGE
				//
				const mockLicenseResult = false;
				jest.spyOn(licenseState, licenseMethod).mockReturnValue(mockLicenseResult);

				//
				// ACT
				//
				const result = roleService.isRoleLicensed(role);

				//
				// ASSERT
				//
				expect(result).toBe(mockLicenseResult);
				expect(licenseState[licenseMethod]).toHaveBeenCalledTimes(1);
			},
		);

		it('should return true for custom roles if licensed', async () => {
			//
			// ARRANGE
			//
			const customRoleSlug = 'custom:test-role';
			const mockLicenseResult = true; // Random boolean
			jest.spyOn(licenseState, 'isCustomRolesLicensed').mockReturnValue(mockLicenseResult);

			//
			// ACT
			//
			const result = roleService.isRoleLicensed(customRoleSlug as any);

			//
			// ASSERT
			//
			expect(result).toBe(mockLicenseResult);
			expect(licenseState.isCustomRolesLicensed).toHaveBeenCalledTimes(1);
		});

		it('should return false for custom roles if not licensed', async () => {
			//
			// ARRANGE
			//
			const customRoleSlug = 'custom:test-role';
			const mockLicenseResult = false; // Random boolean
			jest.spyOn(licenseState, 'isCustomRolesLicensed').mockReturnValue(mockLicenseResult);

			//
			// ACT
			//
			const result = roleService.isRoleLicensed(customRoleSlug as any);

			//
			// ASSERT
			//
			expect(result).toBe(mockLicenseResult);
			expect(licenseState.isCustomRolesLicensed).toHaveBeenCalledTimes(1);
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
