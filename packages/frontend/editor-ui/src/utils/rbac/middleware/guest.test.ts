import { useUsersStore } from '@/stores/users.store';
import { VIEWS } from '@/constants';
import { guestMiddleware } from '@/utils/rbac/middleware/guest';
import type { RouteLocationNormalized } from 'vue-router';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

describe('Middleware', () => {
	const ORIGIN_URL = 'https://n8n.local';

	beforeEach(() => {
		global.window = Object.create(window);

		Object.defineProperty(window, 'location', {
			value: {
				href: '',
				origin: ORIGIN_URL,
			},
			writable: true,
		});
	});

	describe('guest', () => {
		describe('if current user is present', () => {
			beforeEach(() => {
				vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
					typeof useUsersStore
				>);
			});

			afterEach(() => {
				vi.clearAllMocks();
			});

			it('should redirect to given path if valid redirect is provided', async () => {
				const nextMock = vi.fn();
				const toMock = { query: { redirect: '/some-path' } } as unknown as RouteLocationNormalized;
				const fromMock = {} as RouteLocationNormalized;

				await guestMiddleware(toMock, fromMock, nextMock, {});

				expect(nextMock).toHaveBeenCalledWith('/some-path');
			});

			it('should redirect to homepage if no redirect is set', async () => {
				const nextMock = vi.fn();
				const toMock = { query: {} } as RouteLocationNormalized;
				const fromMock = {} as RouteLocationNormalized;

				await guestMiddleware(toMock, fromMock, nextMock, {});

				expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
			});

			it('should redirect to homepage if redirect is not a valid URL', async () => {
				const nextMock = vi.fn();
				const toMock = {
					query: { redirect: 'not-valid-url' },
				} as unknown as RouteLocationNormalized;

				const fromMock = {} as RouteLocationNormalized;

				await guestMiddleware(toMock, fromMock, nextMock, {});

				expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
			});

			it('should redirect to homepage if redirect is not the origin domain', async () => {
				const nextMock = vi.fn();
				const toMock = {
					query: { redirect: 'https://n8n.local.evil.com/some-path' },
				} as unknown as RouteLocationNormalized;

				const fromMock = {} as RouteLocationNormalized;

				await guestMiddleware(toMock, fromMock, nextMock, {});

				expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
			});
		});

		it('should not redirect if no current user is present', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			const nextMock = vi.fn();
			const toMock = { query: {} } as RouteLocationNormalized;
			const fromMock = {} as RouteLocationNormalized;

			await guestMiddleware(toMock, fromMock, nextMock, {});

			expect(nextMock).not.toHaveBeenCalled();
		});
	});
});
