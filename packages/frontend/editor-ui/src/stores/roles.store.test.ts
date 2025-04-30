import { useRolesStore } from '@/stores/roles.store';
import { createPinia, setActivePinia } from 'pinia';

let rolesStore: ReturnType<typeof useRolesStore>;

describe('roles store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		rolesStore = useRolesStore();
	});

	it('should use project roles defined in the frontend in correct order', async () => {
		expect(rolesStore.processedProjectRoles.map(({ role }) => role)).toEqual([
			'project:viewer',
			'project:editor',
			'project:admin',
		]);
	});
});
