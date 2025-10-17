import { useUsersStore } from '@/features/users/users.store';
import { isDefaultUser } from '@/utils/rbac/checks/isDefaultUser';

vi.mock('@/features/users/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Checks', () => {
	describe('isDefaultUser()', () => {
		it('should return false if user not logged in', () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			expect(isDefaultUser()).toBe(false);
		});

		it('should return true if user is default user', () => {
			const mockUser = { id: 'user123', name: 'Test User', isDefaultUser: true };
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: mockUser } as unknown as ReturnType<
				typeof useUsersStore
			>);

			expect(isDefaultUser()).toBe(mockUser.isDefaultUser);
		});
	});
});
