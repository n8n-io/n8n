import type { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { RoleRepository, ScopeRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { RoleCacheService } from '@/services/role-cache.service';
import { RoleService } from '@/services/role.service';
import { Logger } from '@n8n/backend-common';

describe('RoleService.getRoleAssignments and getRoleProjectMembers', () => {
	const licenseState = mock<LicenseState>();
	const roleRepository = mockInstance(RoleRepository);
	const scopeRepository = mockInstance(ScopeRepository);
	const roleCacheService = mockInstance(RoleCacheService);
	const logger = mockInstance(Logger);

	const roleService = new RoleService(
		licenseState,
		roleRepository,
		scopeRepository,
		roleCacheService,
		logger,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getRoleAssignments', () => {
		it('should return project assignments for a valid role', async () => {
			const mockRole = {
				slug: 'project:editor',
				displayName: 'Editor',
				description: null,
				systemRole: true,
				roleType: 'project' as const,
				scopes: [],
				projectRelations: [],
			};

			const mockProjects = [
				{
					projectId: 'project-1',
					projectName: 'My Project',
					projectIcon: { type: 'emoji', value: '🚀' },
					memberCount: 3,
					lastAssigned: '2026-01-15T10:00:00.000Z',
				},
				{
					projectId: 'project-2',
					projectName: 'Another Project',
					projectIcon: null,
					memberCount: 1,
					lastAssigned: null,
				},
			];

			roleRepository.findBySlug.mockResolvedValue(mockRole as never);
			roleRepository.findProjectAssignments.mockResolvedValue(mockProjects);

			const result = await roleService.getRoleAssignments('project:editor');

			expect(roleRepository.findBySlug).toHaveBeenCalledWith('project:editor');
			expect(roleRepository.findProjectAssignments).toHaveBeenCalledWith('project:editor');
			expect(result).toEqual({
				projects: mockProjects,
				totalProjects: 2,
			});
		});

		it('should throw NotFoundError when role does not exist', async () => {
			roleRepository.findBySlug.mockResolvedValue(null);

			await expect(roleService.getRoleAssignments('nonexistent-role')).rejects.toThrow(
				NotFoundError,
			);
			await expect(roleService.getRoleAssignments('nonexistent-role')).rejects.toThrow(
				'Role not found',
			);

			expect(roleRepository.findProjectAssignments).not.toHaveBeenCalled();
		});

		it('should return empty projects array when role has no assignments', async () => {
			const mockRole = {
				slug: 'project:custom-role',
				displayName: 'Custom Role',
				description: 'A custom role',
				systemRole: false,
				roleType: 'project' as const,
				scopes: [],
				projectRelations: [],
			};

			roleRepository.findBySlug.mockResolvedValue(mockRole as never);
			roleRepository.findProjectAssignments.mockResolvedValue([]);

			const result = await roleService.getRoleAssignments('project:custom-role');

			expect(result).toEqual({
				projects: [],
				totalProjects: 0,
			});
		});

		it('should set totalProjects to match the length of the projects array', async () => {
			const mockRole = {
				slug: 'project:viewer',
				displayName: 'Viewer',
				description: null,
				systemRole: true,
				roleType: 'project' as const,
				scopes: [],
				projectRelations: [],
			};

			const mockProjects = [
				{
					projectId: 'p-1',
					projectName: 'Project 1',
					projectIcon: null,
					memberCount: 5,
					lastAssigned: '2026-02-01T00:00:00.000Z',
				},
				{
					projectId: 'p-2',
					projectName: 'Project 2',
					projectIcon: null,
					memberCount: 2,
					lastAssigned: '2026-02-10T00:00:00.000Z',
				},
				{
					projectId: 'p-3',
					projectName: 'Project 3',
					projectIcon: { type: 'icon', value: 'folder' },
					memberCount: 1,
					lastAssigned: null,
				},
			];

			roleRepository.findBySlug.mockResolvedValue(mockRole as never);
			roleRepository.findProjectAssignments.mockResolvedValue(mockProjects);

			const result = await roleService.getRoleAssignments('project:viewer');

			expect(result.totalProjects).toBe(3);
			expect(result.projects).toHaveLength(3);
		});
	});

	describe('getRoleProjectMembers', () => {
		it('should return members for a valid role and project', async () => {
			const mockRole = {
				slug: 'project:editor',
				displayName: 'Editor',
				description: null,
				systemRole: true,
				roleType: 'project' as const,
				scopes: [],
				projectRelations: [],
			};

			const mockMembers = [
				{
					userId: 'user-1',
					firstName: 'Alice',
					lastName: 'Smith',
					email: 'alice@example.com',
					role: 'project:editor',
				},
				{
					userId: 'user-2',
					firstName: 'Bob',
					lastName: null,
					email: 'bob@example.com',
					role: 'project:editor',
				},
			];

			roleRepository.findBySlug.mockResolvedValue(mockRole as never);
			roleRepository.findAllProjectMembers.mockResolvedValue(mockMembers);

			const result = await roleService.getRoleProjectMembers('project:editor', 'project-123');

			expect(roleRepository.findBySlug).toHaveBeenCalledWith('project:editor');
			expect(roleRepository.findAllProjectMembers).toHaveBeenCalledWith(
				'project-123',
				'project:editor',
			);
			expect(result).toEqual({ members: mockMembers });
		});

		it('should throw NotFoundError when role does not exist', async () => {
			roleRepository.findBySlug.mockResolvedValue(null);

			await expect(
				roleService.getRoleProjectMembers('nonexistent-role', 'project-123'),
			).rejects.toThrow(NotFoundError);
			await expect(
				roleService.getRoleProjectMembers('nonexistent-role', 'project-123'),
			).rejects.toThrow('Role not found');

			expect(roleRepository.findAllProjectMembers).not.toHaveBeenCalled();
		});

		it('should return empty members array when project has no members with the role', async () => {
			const mockRole = {
				slug: 'project:admin',
				displayName: 'Admin',
				description: null,
				systemRole: true,
				roleType: 'project' as const,
				scopes: [],
				projectRelations: [],
			};

			roleRepository.findBySlug.mockResolvedValue(mockRole as never);
			roleRepository.findAllProjectMembers.mockResolvedValue([]);

			const result = await roleService.getRoleProjectMembers('project:admin', 'project-456');

			expect(result).toEqual({ members: [] });
		});

		it('should pass the correct projectId and roleSlug to the repository', async () => {
			const mockRole = {
				slug: 'project:custom-abc123',
				displayName: 'Custom Role',
				description: 'A custom project role',
				systemRole: false,
				roleType: 'project' as const,
				scopes: [],
				projectRelations: [],
			};

			roleRepository.findBySlug.mockResolvedValue(mockRole as never);
			roleRepository.findAllProjectMembers.mockResolvedValue([]);

			await roleService.getRoleProjectMembers('project:custom-abc123', 'specific-project-id');

			expect(roleRepository.findBySlug).toHaveBeenCalledWith('project:custom-abc123');
			expect(roleRepository.findAllProjectMembers).toHaveBeenCalledWith(
				'specific-project-id',
				'project:custom-abc123',
			);
		});
	});
});
