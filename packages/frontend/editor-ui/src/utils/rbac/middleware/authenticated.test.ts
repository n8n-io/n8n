import { authenticatedMiddleware } from '@/utils/rbac/middleware/authenticated';
import { useUsersStore } from '@/stores/users.store';
import { VIEWS } from '@/constants';
import type { RouteLocationNormalized } from 'vue-router';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Middleware', () => {
	describe('authenticated', () => {
		it('should redirect to signin if no current user is present', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			const nextMock = vi.fn();
			const toMock = { query: {} } as RouteLocationNormalized;
			const fromMock = {} as RouteLocationNormalized;

			await authenticatedMiddleware(toMock, fromMock, nextMock, {});

			expect(nextMock).toHaveBeenCalledWith({
				name: VIEWS.SIGNIN,
				query: { redirect: encodeURIComponent('/') },
			});
		});

		it('should call next with the correct redirect query if present', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			const nextMock = vi.fn();
			const toMock = { query: { redirect: '/' } } as unknown as RouteLocationNormalized;
			const fromMock = {} as RouteLocationNormalized;

			await authenticatedMiddleware(toMock, fromMock, nextMock, {});

			expect(nextMock).toHaveBeenCalledWith({
				name: VIEWS.SIGNIN,
				query: { redirect: '/' },
			});
		});

		it('should allow navigation if a current user is present', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
				typeof useUsersStore
			>);

			const nextMock = vi.fn();
			const toMock = { query: {} } as RouteLocationNormalized;
			const fromMock = {} as RouteLocationNormalized;

			await authenticatedMiddleware(toMock, fromMock, nextMock, {});

			expect(nextMock).not.toHaveBeenCalled();
		});
	});
});
