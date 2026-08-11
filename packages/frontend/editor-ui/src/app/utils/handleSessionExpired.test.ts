import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createPinia, setActivePinia } from 'pinia';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import {
	handleSessionExpired,
	restoreNotificationSuppression,
} from '@/app/utils/handleSessionExpired';
import { useUsersStore } from '@n8n/stores/users.store';

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

function createRouterMock(
	push = vi.fn(),
	currentRoute: Partial<RouteLocationNormalizedLoaded> = { fullPath: '/' },
	resolve = vi.fn(),
): Router {
	return { push, resolve, currentRoute: { value: currentRoute } } as unknown as Router;
}

describe('handleSessionExpired', () => {
	let ownBackendURL: string;

	beforeEach(() => {
		setActivePinia(createPinia());
		ownBackendURL = useRootStore().restApiContext.baseUrl;
	});

	it('does nothing when there is no current user', async () => {
		const logout = vi.fn();
		vi.mocked(useUsersStore).mockReturnValue({ currentUser: null, logout } as unknown as ReturnType<
			typeof useUsersStore
		>);
		const push = vi.fn();
		const router = createRouterMock(push);

		await handleSessionExpired(router, ownBackendURL);

		expect(logout).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		expect(useNotificationsStore().areNotificationsSuppressed).toBe(false);
	});

	it('does nothing when the 401 came from a different host than the app backend', async () => {
		const logout = vi.fn();
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const push = vi.fn();
		const router = createRouterMock(push);

		await handleSessionExpired(router, 'https://thirdparty.example.com');

		expect(logout).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	});

	it('logs out and redirects to signin with the current path when a current user is present', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const push = vi.fn();
		const router = createRouterMock(push, { fullPath: '/workflow/1' });

		await handleSessionExpired(router, ownBackendURL);

		expect(logout).toHaveBeenCalledTimes(1);
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent('/workflow/1'), sessionExpired: 'true' },
		});
	});

	it('drops the open node id from the redirect path when there are unsaved changes', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		useUIStore().markStateDirty();

		const push = vi.fn();
		const resolve = vi.fn().mockReturnValue({ fullPath: '/workflow/1' });
		const router = createRouterMock(
			push,
			{
				fullPath: '/workflow/1/abc123',
				name: VIEWS.WORKFLOW,
				params: { workflowId: '1', nodeId: 'abc123' },
				query: {},
			},
			resolve,
		);

		await handleSessionExpired(router, ownBackendURL);

		expect(resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: '1', nodeId: undefined },
			query: {},
		});
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent('/workflow/1'), sessionExpired: 'true' },
		});
	});

	it('keeps the open node id in the redirect path when there are no unsaved changes', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);

		const push = vi.fn();
		const resolve = vi.fn();
		const router = createRouterMock(
			push,
			{
				fullPath: '/workflow/1/abc123',
				name: VIEWS.WORKFLOW,
				params: { workflowId: '1', nodeId: 'abc123' },
				query: {},
			},
			resolve,
		);

		await handleSessionExpired(router, ownBackendURL);

		expect(resolve).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent('/workflow/1/abc123'), sessionExpired: 'true' },
		});
	});

	it('suppresses notifications synchronously, before logout is awaited', () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const router = createRouterMock();

		void handleSessionExpired(router, ownBackendURL);

		// Asserted before awaiting: suppression must be set synchronously.
		expect(useNotificationsStore().areNotificationsSuppressed).toBe(true);
	});

	it('still redirects even if logout rejects', async () => {
		const logout = vi.fn().mockRejectedValue(new Error('Unauthorized'));
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const push = vi.fn();
		const router = createRouterMock(push);

		await handleSessionExpired(router, ownBackendURL);

		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: VIEWS.SIGNIN }));
	});

	it('only handles the first of several concurrent calls', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const push = vi.fn();
		const router = createRouterMock(push);

		await Promise.all([
			handleSessionExpired(router, ownBackendURL),
			handleSessionExpired(router, ownBackendURL),
		]);

		expect(logout).toHaveBeenCalledTimes(1);
		expect(push).toHaveBeenCalledTimes(1);
	});

	describe('restoreNotificationSuppression', () => {
		it('no-ops to false when called without a session expiry ever having happened', () => {
			restoreNotificationSuppression();

			expect(useNotificationsStore().areNotificationsSuppressed).toBe(false);
		});

		it('restores suppression to false when nothing suppressed it before the expiry', async () => {
			const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: { id: '123' },
				logout,
			} as unknown as ReturnType<typeof useUsersStore>);
			const router = createRouterMock();

			await handleSessionExpired(router, ownBackendURL);
			restoreNotificationSuppression();

			expect(useNotificationsStore().areNotificationsSuppressed).toBe(false);
		});

		it("restores an embed's prior suppression setting instead of hardcoding it off", async () => {
			useNotificationsStore().setNotificationsSuppressed(true, { allowErrors: true });

			const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
			vi.mocked(useUsersStore).mockReturnValue({
				currentUser: { id: '123' },
				logout,
			} as unknown as ReturnType<typeof useUsersStore>);
			const router = createRouterMock();

			await handleSessionExpired(router, ownBackendURL);
			restoreNotificationSuppression();

			const notificationsStore = useNotificationsStore();
			expect(notificationsStore.areNotificationsSuppressed).toBe(true);
			expect(notificationsStore.allowErrorNotificationsWhenSuppressed).toBe(true);
		});
	});
});
