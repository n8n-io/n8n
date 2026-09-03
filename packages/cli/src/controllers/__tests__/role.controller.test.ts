import type { AuthenticatedRequest, Project } from '@n8n/db';
import type { Role } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';

import { RoleController } from '../role.controller';

describe('RoleController', () => {
	const eventService = mock<EventService>();
	const roleService = mock<RoleService>();
	const projectService = mock<ProjectService>();
	const controller = new RoleController(roleService, eventService, projectService);

	const managerRequest = () =>
		mock<AuthenticatedRequest>({
			user: { id: '123', role: { scopes: [{ slug: 'role:manage' }] } },
		});

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	describe('emits action events', () => {
		describe('createRole', () => {
			it('should emit custom-role-created', async () => {
				const request = managerRequest();
				roleService.createCustomRole.mockResolvedValue({
					slug: 'custom-editor',
					scopes: ['workflow:read', 'workflow:update'],
				} as Role);

				await controller.createRole(request, mock(), mock());

				expect(eventService.emit).toHaveBeenCalledWith('custom-role-created', {
					userId: '123',
					roleSlug: 'custom-editor',
					scopes: ['workflow:read', 'workflow:update'],
				});
			});
		});

		describe('deleteRole', () => {
			it('should pass the reassignment role through to the service for an entitled caller', async () => {
				const request = mock<AuthenticatedRequest>({
					user: {
						id: '123',
						role: {
							slug: 'global:admin',
							scopes: [{ slug: 'role:manage' }, { slug: 'user:changeRole' }],
						},
					},
				});
				roleService.getRole.mockResolvedValue({
					slug: 'global:custom-editor',
					roleType: 'global',
				} as Role);
				roleService.removeCustomRole.mockResolvedValue({ slug: 'global:custom-editor' } as Role);

				await controller.deleteRole(request, mock(), 'global:custom-editor', {
					reassignRoleSlug: 'global:member',
				});

				expect(roleService.removeCustomRole).toHaveBeenCalledWith({
					slug: 'global:custom-editor',
					reassignRoleSlug: 'global:member',
					userId: '123',
				});
			});

			it('should ignore the reassignment role when the caller lacks user:changeRole', async () => {
				const request = mock<AuthenticatedRequest>({
					user: {
						id: '123',
						role: { slug: 'global:admin', scopes: [{ slug: 'role:manage' }] },
					},
				});
				roleService.getRole.mockResolvedValue({
					slug: 'global:custom-editor',
					roleType: 'global',
				} as Role);
				roleService.removeCustomRole.mockResolvedValue({ slug: 'global:custom-editor' } as Role);

				await controller.deleteRole(request, mock(), 'global:custom-editor', {
					reassignRoleSlug: 'global:member',
				});

				expect(roleService.removeCustomRole).toHaveBeenCalledWith({
					slug: 'global:custom-editor',
					reassignRoleSlug: undefined,
					userId: '123',
				});
			});

			it('should ignore the reassignment role when the caller holds the role being deleted', async () => {
				const request = mock<AuthenticatedRequest>({
					user: {
						id: '123',
						role: {
							slug: 'global:custom-editor',
							scopes: [{ slug: 'role:manage' }, { slug: 'user:changeRole' }],
						},
					},
				});
				roleService.getRole.mockResolvedValue({
					slug: 'global:custom-editor',
					roleType: 'global',
				} as Role);
				roleService.removeCustomRole.mockResolvedValue({ slug: 'global:custom-editor' } as Role);

				await controller.deleteRole(request, mock(), 'global:custom-editor', {
					reassignRoleSlug: 'global:member',
				});

				expect(roleService.removeCustomRole).toHaveBeenCalledWith({
					slug: 'global:custom-editor',
					reassignRoleSlug: undefined,
					userId: '123',
				});
			});

			it('should ignore the reassignment role for project roles', async () => {
				const request = mock<AuthenticatedRequest>({
					user: {
						id: '123',
						role: {
							slug: 'global:admin',
							scopes: [{ slug: 'role:manage' }, { slug: 'user:changeRole' }],
						},
					},
				});
				roleService.getRole.mockResolvedValue({
					slug: 'project:custom-editor',
					roleType: 'project',
				} as Role);
				roleService.removeCustomRole.mockResolvedValue({ slug: 'project:custom-editor' } as Role);

				await controller.deleteRole(request, mock(), 'project:custom-editor', {
					reassignRoleSlug: 'project:admin',
				});

				expect(roleService.removeCustomRole).toHaveBeenCalledWith({
					slug: 'project:custom-editor',
					reassignRoleSlug: undefined,
					userId: '123',
				});
			});
		});
	});

	describe('getRoleProjectMembers', () => {
		const projectRole = { slug: 'project:admin', roleType: 'project' } as Role;

		it('should return the members when the caller can list the project', async () => {
			const request = managerRequest();
			roleService.getRole.mockResolvedValue(projectRole);
			projectService.getProjectWithScope.mockResolvedValue(mock<Project>({ id: 'project-1' }));
			roleService.getRoleProjectMembers.mockResolvedValue({
				members: [
					{
						userId: 'user-1',
						firstName: 'Ada',
						lastName: 'Lovelace',
						email: 'ada@example.com',
						role: 'project:admin',
					},
				],
			});

			const result = await controller.getRoleProjectMembers(
				request,
				mock(),
				'project:admin',
				'project-1',
			);

			expect(projectService.getProjectWithScope).toHaveBeenCalledWith(request.user, 'project-1', [
				'project:list',
			]);
			expect(result.members).toHaveLength(1);
		});

		it('should not return the members when the caller cannot list the project', async () => {
			const request = managerRequest();
			roleService.getRole.mockResolvedValue(projectRole);
			projectService.getProjectWithScope.mockResolvedValue(null);

			await expect(
				controller.getRoleProjectMembers(request, mock(), 'project:admin', 'project-1'),
			).rejects.toThrow(NotFoundError);

			expect(roleService.getRoleProjectMembers).not.toHaveBeenCalled();
		});
	});

	describe('getRoleAssignments', () => {
		const projectRole = { slug: 'project:admin', roleType: 'project' } as Role;

		const assignment = (projectId: string, projectName: string) => ({
			projectId,
			projectName,
			projectIcon: null,
			memberCount: 2,
			lastAssigned: null,
		});

		it('should only return the projects the caller can list, keeping the total intact', async () => {
			const request = managerRequest();
			roleService.getRole.mockResolvedValue(projectRole);
			roleService.getRoleAssignments.mockResolvedValue({
				projects: [assignment('project-1', 'Mine'), assignment('project-2', 'Not mine')],
				totalProjects: 2,
			});
			projectService.getProjectIdsWithScope.mockResolvedValue(['project-1']);

			const result = await controller.getRoleAssignments(request, mock(), 'project:admin');

			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(
				request.user,
				['project:list'],
				['project-1', 'project-2'],
			);
			expect(result.projects).toEqual([assignment('project-1', 'Mine')]);
			// the count stays instance-wide so the delete-impact signal is not silently wrong
			expect(result.totalProjects).toBe(2);
		});

		it('should not query visibility when the role has no assignments', async () => {
			const request = managerRequest();
			roleService.getRole.mockResolvedValue(projectRole);
			roleService.getRoleAssignments.mockResolvedValue({ projects: [], totalProjects: 0 });

			const result = await controller.getRoleAssignments(request, mock(), 'project:admin');

			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
			expect(result.projects).toEqual([]);
		});
	});
});
