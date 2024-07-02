import { useRolesStore } from '@/stores/roles.store';
import * as rolesApi from '@/api/roles.api';
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
			project: [
				{
					name: 'Project Admin',
					role: 'project:admin',
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
				},
				{
					name: 'Project Owner',
					role: 'project:personalOwner',
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
				},
				{
					name: 'Project Editor',
					role: 'project:editor',
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
				},
				{
					name: 'Project Viewer',
					role: 'project:viewer',
					scopes: [
						'credential:list',
						'credential:read',
						'project:list',
						'project:read',
						'workflow:list',
						'workflow:read',
					],
					licensed: true,
				},
			],
		});
		await rolesStore.fetchRoles();
		expect(rolesStore.processedProjectRoles.map(({ role }) => role)).toEqual([
			'project:editor',
			'project:admin',
		]);
	});
});
