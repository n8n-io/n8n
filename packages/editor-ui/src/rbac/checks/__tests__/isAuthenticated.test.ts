import { useUsersStore } from '@/stores/users.store';
import { isAuthenticated } from '@/rbac/checks/isAuthenticated';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Checks', () => {
	describe('isAuthenticated()', () => {
		it('should return true if there is a current user', () => {
			const mockUser = { id: 'user123', name: 'Test User' };
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: mockUser } as unknown as ReturnType<
				typeof useUsersStore
			>);

			expect(isAuthenticated()).toBe(true);
		});

		it('should return false if there is no current user', () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			expect(isAuthenticated()).toBe(false);
		});
	});
});
