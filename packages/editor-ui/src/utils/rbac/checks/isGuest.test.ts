import { useUsersStore } from '@/stores/users.store';
import { isGuest } from '@/utils/rbac/checks/isGuest';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Checks', () => {
	describe('isGuest()', () => {
		it('should return false if there is a current user', () => {
			const mockUser = { id: 'user123', name: 'Test User' };
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: mockUser } as unknown as ReturnType<
				typeof useUsersStore
			>);

			expect(isGuest()).toBe(false);
		});

		it('should return true if there is no current user', () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			expect(isGuest()).toBe(true);
		});
	});
});
