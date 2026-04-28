import type { AuthenticatedRequest } from '@n8n/db';
import type { Role } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { RoleService } from '@/services/role.service';

import { RoleController } from '../role.controller';

describe('RoleController', () => {
	const eventService = mock<EventService>();
	const roleService = mock<RoleService>();
	const controller = new RoleController(roleService, eventService);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('emits action events', () => {
		describe('createRole', () => {
			it('should emit custom-role-created', async () => {
				const request = mock<AuthenticatedRequest>({ user: { id: '123' } });
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

		describe('updateRole', () => {
			it('should emit custom-role-updated', async () => {
				const request = mock<AuthenticatedRequest>({ user: { id: '123' } });
				roleService.updateCustomRole.mockResolvedValue({
					slug: 'custom-editor',
					scopes: ['workflow:read', 'workflow:update', 'workflow:delete'],
				} as Role);

				await controller.updateRole(request, mock(), 'custom-editor', mock());

				expect(eventService.emit).toHaveBeenCalledWith('custom-role-updated', {
					userId: '123',
					roleSlug: 'custom-editor',
					scopes: ['workflow:read', 'workflow:update', 'workflow:delete'],
				});
			});
		});

		describe('deleteRole', () => {
			it('should emit custom-role-deleted', async () => {
				const request = mock<AuthenticatedRequest>({ user: { id: '123' } });
				roleService.removeCustomRole.mockResolvedValue({
					slug: 'custom-editor',
				} as Role);

				await controller.deleteRole(request, mock(), 'custom-editor');

				expect(eventService.emit).toHaveBeenCalledWith('custom-role-deleted', {
					userId: '123',
					roleSlug: 'custom-editor',
				});
			});
		});
	});
});
