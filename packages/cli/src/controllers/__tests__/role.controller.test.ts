import type { AuthenticatedRequest } from '@n8n/db';
import type { Role } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { RoleService } from '@/services/role.service';

import { RoleController } from '../role.controller';

describe('RoleController', () => {
	const eventService = mock<EventService>();
	const roleService = mock<RoleService>();
	const controller = new RoleController(roleService, eventService);

	const managerRequest = () =>
		mock<AuthenticatedRequest>({
			user: { id: '123', role: { scopes: [{ slug: 'role:manage' }] } },
		});

	beforeEach(() => {
		vi.restoreAllMocks();
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
			it('should emit custom-role-deleted', async () => {
				const request = managerRequest();
				roleService.getRole.mockResolvedValue({ roleType: 'project' } as Role);
				roleService.removeCustomRole.mockResolvedValue({
					slug: 'custom-editor',
				} as Role);

				await controller.deleteRole(request, mock(), 'custom-editor', mock());

				expect(eventService.emit).toHaveBeenCalledWith('custom-role-deleted', {
					userId: '123',
					roleSlug: 'custom-editor',
				});
			});

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

				expect(roleService.removeCustomRole).toHaveBeenCalledWith(
					'global:custom-editor',
					'global:member',
				);
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

				expect(roleService.removeCustomRole).toHaveBeenCalledWith(
					'global:custom-editor',
					undefined,
				);
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

				expect(roleService.removeCustomRole).toHaveBeenCalledWith(
					'global:custom-editor',
					undefined,
				);
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

				expect(roleService.removeCustomRole).toHaveBeenCalledWith(
					'project:custom-editor',
					undefined,
				);
			});
		});
	});
});
