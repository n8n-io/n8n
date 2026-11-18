import { createTestingPinia } from '@pinia/testing';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRowRulePeople } from '@/features/core/dataTable/composables/useRowRulePeople';

describe('useRowRulePeople', () => {
	beforeEach(() => {
		createTestingPinia();
		const usersStore = mockedStore(useUsersStore);
		usersStore.allUsers = [
			{ id: 'u1', email: 'ada@example.com', fullName: 'Ada Lovelace', isPendingUser: false },
			{ id: 'u2', email: 'pending@example.com', isPendingUser: true },
		] as never;
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.availableProjects = [
			{ id: 'p1', name: 'Sales EMEA', type: 'team' },
			{ id: 'p2', name: 'Ada', type: 'personal' },
		] as never;
	});

	it('offers people by the value the rule matches on', () => {
		const { options } = useRowRulePeople();

		expect(options('id')).toEqual([{ value: 'u1', label: 'Ada Lovelace (ada@example.com)' }]);
		expect(options('email')).toEqual([
			{ value: 'ada@example.com', label: 'Ada Lovelace (ada@example.com)' },
		]);
	});

	it('offers only team projects for a team column', () => {
		expect(useRowRulePeople().options('project')).toEqual([{ value: 'p1', label: 'Sales EMEA' }]);
	});

	it('names a known value and leaves an unknown one alone', () => {
		const { label } = useRowRulePeople();

		expect(label('id', 'u1')).toBe('Ada Lovelace (ada@example.com)');
		expect(label('project', 'p1')).toBe('Sales EMEA');
		expect(label('id', 'someone-else')).toBeUndefined();
	});
});
