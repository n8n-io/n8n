import { useRolesStore } from '@/app/stores/roles.store';
import * as rolesApi from '@n8n/rest-api-client/api/roles';
import { createPinia, setActivePinia } from 'pinia';

let rolesStore: ReturnType<typeof useRolesStore>;

describe('roles store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		rolesStore = useRolesStore();
	});

	it('should use project roles defined in the frontend in correct order', async () => {
		vi.spyOn(rolesApi, 'getRoles').mockResolvedValue({
			global: [],
			credential: [],
			workflow: [],
			secretsProviderConnection: [],
			project: [
				{
					displayName: 'Project Admin',
					slug: 'project:admin',
					description: 'Project Admin',
					scopes: [
						'workflow:create',
						'workflow:read',
						'workflow:update',
						'workflow:delete',
						'workflow:list',
						'workflow:execute',
						'workflow:move',
						'credential:create',
						'credential:read',
						'credential:update',
						'credential:delete',
						'credential:list',
						'credential:move',
						'project:list',
						'project:read',
						'project:update',
						'project:delete',
					],
					licensed: true,
					systemRole: true,
					roleType: 'project',
				},
				{
					displayName: 'Project Owner',
					slug: 'project:personalOwner',
					description: 'Project Owner',
					scopes: [
						'workflow:create',
						'workflow:read',
						'workflow:update',
						'workflow:delete',
						'workflow:list',
						'workflow:execute',
						'workflow:share',
						'workflow:move',
						'credential:create',
						'credential:read',
						'credential:update',
						'credential:delete',
						'credential:list',
						'credential:share',
						'credential:move',
						'project:list',
						'project:read',
					],
					licensed: true,
					roleType: 'project',
					systemRole: true,
				},
				{
					displayName: 'Project Editor',
					slug: 'project:editor',
					description: 'Project Editor',
					scopes: [
						'workflow:create',
						'workflow:read',
						'workflow:update',
						'workflow:delete',
						'workflow:list',
						'workflow:execute',
						'credential:create',
						'credential:read',
						'credential:update',
						'credential:delete',
						'credential:list',
						'project:list',
						'project:read',
					],
					licensed: true,
					roleType: 'project',
					systemRole: true,
				},
				{
					displayName: 'Project Viewer',
					slug: 'project:viewer',
					description: 'Project Viewer',
					scopes: [
						'credential:list',
						'credential:read',
						'project:list',
						'project:read',
						'workflow:list',
						'workflow:read',
					],
					licensed: true,
					roleType: 'project',
					systemRole: true,
				},
			],
		});
		await rolesStore.fetchRoles();
		expect(rolesStore.processedProjectRoles.map(({ slug }) => slug)).toEqual([
			'project:viewer',
			'project:editor',
			'project:admin',
		]);
	});

	it('should exclude global:owner and order instance roles (ordered system roles first, then custom alphabetically)', async () => {
		vi.spyOn(rolesApi, 'getRoles').mockResolvedValue({
			project: [],
			credential: [],
			workflow: [],
			secretsProviderConnection: [],
			global: [
				{
					displayName: 'Owner',
					slug: 'global:owner',
					description: 'Owner',
					scopes: [],
					licensed: true,
					systemRole: true,
					roleType: 'global',
					usedByUsers: 1,
				},
				{
					displayName: 'Zeta',
					slug: 'custom:zeta',
					description: 'Custom Zeta',
					scopes: [],
					licensed: true,
					systemRole: false,
					roleType: 'global',
					usedByUsers: 0,
				},
				{
					displayName: 'Member',
					slug: 'global:member',
					description: 'Member',
					scopes: [],
					licensed: true,
					systemRole: true,
					roleType: 'global',
					usedByUsers: 5,
				},
				{
					displayName: 'Alpha',
					slug: 'custom:alpha',
					description: 'Custom Alpha',
					scopes: [],
					licensed: true,
					systemRole: false,
					roleType: 'global',
					usedByUsers: 0,
				},
				{
					displayName: 'Admin',
					slug: 'global:admin',
					description: 'Admin',
					scopes: [],
					licensed: true,
					systemRole: true,
					roleType: 'global',
					usedByUsers: 2,
				},
			],
		});
		await rolesStore.fetchRoles();

		expect(rolesStore.processedInstanceRoles.map(({ slug }) => slug)).toEqual([
			'global:admin',
			'global:member',
			'custom:alpha',
			'custom:zeta',
		]);
		// global:owner is never managed via the Roles UI
		expect(rolesStore.processedInstanceRoles.some((r) => r.slug === 'global:owner')).toBe(false);
	});
});
