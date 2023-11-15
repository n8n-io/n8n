import { useUsersStore } from '@/stores/users.store';
import { VIEWS } from '@/constants';
import { guestMiddleware } from '@/rbac/middleware/guest';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Middleware', () => {
	describe('guest', () => {
		it('should redirect to given path if current user is present and valid redirect is provided', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } });

			const nextMock = vi.fn();
			const toMock = { query: { redirect: '/some-path' } };
			const fromMock = {};

			await guestMiddleware(toMock, fromMock, nextMock);

			expect(nextMock).toHaveBeenCalledWith('/some-path');
		});

		it('should redirect to homepage if current user is present and no valid redirect', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } });

			const nextMock = vi.fn();
			const toMock = { query: {} };
			const fromMock = {};

			await guestMiddleware(toMock, fromMock, nextMock);

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should allow navigation if no current user is present', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null });

			const nextMock = vi.fn();
			const toMock = { query: {} };
			const fromMock = {};

			await guestMiddleware(toMock, fromMock, nextMock);

			expect(nextMock).toHaveBeenCalledTimes(0);
		});
	});
});
