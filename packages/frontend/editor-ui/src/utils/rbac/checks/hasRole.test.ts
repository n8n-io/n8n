import { useUsersStore } from '@/stores/users.store';
import { hasRole } from '@/utils/rbac/checks';
import { ROLE } from '@n8n/api-types';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Checks', () => {
	describe('hasRole', () => {
		it('should return true if the user has the specified role', () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: {
					isDefaultUser: false,
					role: ROLE.Owner,
				},
			} as ReturnType<typeof useUsersStore>);

			expect(hasRole([ROLE.Owner])).toBe(true);
		});

		it('should return false if the user does not have the specified role', () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: {
					isDefaultUser: false,
					role: 'global:member',
				},
			} as ReturnType<typeof useUsersStore>);

			expect(hasRole([ROLE.Owner])).toBe(false);
		});

		it('should return true for default user if checking for default role', () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: {
					isDefaultUser: true,
				},
			} as ReturnType<typeof useUsersStore>);

			expect(hasRole([ROLE.Default])).toBe(true);
		});

		it('should return false if there is no current user', () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			expect(hasRole([ROLE.Owner])).toBe(false);
		});
	});
});
