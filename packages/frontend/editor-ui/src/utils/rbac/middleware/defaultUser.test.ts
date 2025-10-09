import { useUsersStore } from '@/stores/users.store';
import { VIEWS } from '@/constants';
import { defaultUserMiddleware } from '@/utils/rbac/middleware/defaultUser';
import type { RouteLocationNormalized } from 'vue-router';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Middleware', () => {
	describe('defaultUser', () => {
		it('should redirect to homepage if user not logged in', async () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: null,
			} as ReturnType<typeof useUsersStore>);

			const nextMock = vi.fn();
			const toMock = { query: {} } as RouteLocationNormalized;
			const fromMock = {} as RouteLocationNormalized;

			await defaultUserMiddleware(toMock, fromMock, nextMock, {});

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should redirect to homepage if user is not default user', async () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: { id: '123', isDefaultUser: false },
			} as ReturnType<typeof useUsersStore>);

			const nextMock = vi.fn();
			const toMock = { query: {} } as RouteLocationNormalized;
			const fromMock = {} as RouteLocationNormalized;

			await defaultUserMiddleware(toMock, fromMock, nextMock, {});

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should allow navigation if a current user is present', async () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: { id: '123', isDefaultUser: true },
			} as ReturnType<typeof useUsersStore>);

			const nextMock = vi.fn();
			const toMock = { query: {} } as RouteLocationNormalized;
			const fromMock = {} as RouteLocationNormalized;

			await defaultUserMiddleware(toMock, fromMock, nextMock, {});

			expect(nextMock).not.toHaveBeenCalled();
		});
	});
});
