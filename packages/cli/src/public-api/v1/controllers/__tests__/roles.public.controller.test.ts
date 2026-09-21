import type { CreateRoleDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Role } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { RoleService } from '@/services/role.service';

import { RolesPublicController } from '../roles.public.controller';

describe('RolesPublicController', () => {
	const roleService = mock<RoleService>();
	const eventService = mock<EventService>();
	const controller = new RolesPublicController(roleService, eventService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// The public route reaches the same service as the role editor, so `source` is
	// the only thing telling the two surfaces apart downstream.
	it("createRole emits custom-role-created with source 'public-api'", async () => {
		roleService.createCustomRole.mockResolvedValue({
			slug: 'global:auditor-abc123',
			displayName: 'Auditor',
			description: null,
			systemRole: false,
			roleType: 'global',
			scopes: ['insights:read'],
			createdAt: new Date(),
			updatedAt: new Date(),
		} as Role);

		const request = mock<AuthenticatedRequest>({
			user: { id: '123', role: { scopes: [{ slug: 'role:manage' }] } },
			tokenGrant: { apiKeyScopes: ['role:manage'] },
		});

		await controller.createRole(request, mock(), {
			displayName: 'Auditor',
			roleType: 'global',
			scopes: ['insights:read'],
		} as CreateRoleDto);

		expect(eventService.emit).toHaveBeenCalledWith('custom-role-created', {
			userId: '123',
			roleSlug: 'global:auditor-abc123',
			scopes: ['insights:read'],
			source: 'public-api',
		});
	});
});
