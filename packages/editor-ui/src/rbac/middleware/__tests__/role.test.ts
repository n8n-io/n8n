import { roleMiddleware } from '@/rbac/middleware/role';
import { useUsersStore } from '@/stores/users.store';
import { ROLE } from '@/utils/userUtils';
import type { IUser } from '@/Interface';
import type { RouteLocationNormalized } from 'vue-router';
import { VIEWS } from '@/constants';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Middleware', () => {
	describe('role', () => {
		it('should redirect to homepage if the user does not have the required role', async () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: {
					isDefaultUser: false,
					role: 'global:owner',
				} as IUser,
			} as ReturnType<typeof useUsersStore>);

			const nextMock = vi.fn();
			const role = [ROLE.Default];

			await roleMiddleware(
				{} as RouteLocationNormalized,
				{} as RouteLocationNormalized,
				nextMock,
				role,
			);

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should redirect to homepage if the user is not logged in', async () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: null,
			} as ReturnType<typeof useUsersStore>);

			const nextMock = vi.fn();
			const role = [ROLE.Default];

			await roleMiddleware(
				{} as RouteLocationNormalized,
				{} as RouteLocationNormalized,
				nextMock,
				role,
			);

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should nor redirect if the user has the required role', async () => {
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: {
					isDefaultUser: false,
					role: 'global:owner',
				} as IUser,
			} as ReturnType<typeof useUsersStore>);

			const nextMock = vi.fn();
			const role = [ROLE.Owner];

			await roleMiddleware(
				{} as RouteLocationNormalized,
				{} as RouteLocationNormalized,
				nextMock,
				role,
			);

			expect(nextMock).not.toHaveBeenCalled();
		});
	});
});
