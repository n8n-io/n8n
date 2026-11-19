import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createPinia, setActivePinia } from 'pinia';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { handleSessionExpired } from '@/app/utils/handleSessionExpired';
import { useUsersStore } from '@n8n/stores/users.store';

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

const SIGNIN_HREF = '/signin';

function createRouterMock(
	currentRoute: Partial<RouteLocationNormalizedLoaded> = { fullPath: '/' },
	resolveWorkflowRoute: (to: unknown) => unknown = vi.fn(),
): Router {
	const resolve = vi.fn((to: { name?: unknown }) =>
		to.name === VIEWS.SIGNIN ? { href: SIGNIN_HREF } : resolveWorkflowRoute(to),
	);
	return { resolve, currentRoute: { value: currentRoute } } as unknown as Router;
}

describe('handleSessionExpired', () => {
	let ownBackendURL: string;

	beforeEach(() => {
		setActivePinia(createPinia());
		ownBackendURL = useRootStore().restApiContext.baseUrl;
		window.preventNodeViewBeforeUnload = undefined;

		Object.defineProperty(window, 'location', {
			value: { href: '' },
			writable: true,
		});
	});

	it('does nothing when there is no current user', async () => {
		const logout = vi.fn();
		vi.mocked(useUsersStore).mockReturnValue({ currentUser: null, logout } as unknown as ReturnType<
			typeof useUsersStore
		>);
		const router = createRouterMock();
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await handleSessionExpired(router, ownBackendURL);

		expect(logout).not.toHaveBeenCalled();
		expect(hrefSpy).not.toHaveBeenCalled();
		expect(useNotificationsStore().areNotificationsSuppressed).toBe(false);
	});

	it('does nothing when the 401 came from a different host than the app backend', async () => {
		const logout = vi.fn();
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const router = createRouterMock();
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await handleSessionExpired(router, 'https://thirdparty.example.com');

		expect(logout).not.toHaveBeenCalled();
		expect(hrefSpy).not.toHaveBeenCalled();
	});

	it('logs out when the public API rejects the session', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const router = createRouterMock();
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await handleSessionExpired(router, '/api/v1');

		expect(logout).toHaveBeenCalledTimes(1);
		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
	});

	it('logs out, skips the unsaved-changes prompt, and reloads to signin with the current path when a current user is present', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const router = createRouterMock({ fullPath: '/workflow/1' });
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await handleSessionExpired(router, ownBackendURL);

		expect(logout).toHaveBeenCalledTimes(1);
		expect(window.preventNodeViewBeforeUnload).toBe(true);
		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent('/workflow/1'), sessionExpired: 'true' },
		});
		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
	});

	it('drops the open node id from the redirect path when there are unsaved changes', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		useUIStore().markStateDirty();

		const resolveWorkflowRoute = vi.fn().mockReturnValue({ fullPath: '/workflow/1' });
		const router = createRouterMock(
			{
				fullPath: '/workflow/1/abc123',
				name: VIEWS.WORKFLOW,
				params: { workflowId: '1', nodeId: 'abc123' },
				query: {},
			},
			resolveWorkflowRoute,
		);
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await handleSessionExpired(router, ownBackendURL);

		expect(resolveWorkflowRoute).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: '1', nodeId: undefined },
			query: {},
		});
		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent('/workflow/1'), sessionExpired: 'true' },
		});
		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
	});

	it('keeps the open node id in the redirect path when there are no unsaved changes', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);

		const resolveWorkflowRoute = vi.fn();
		const router = createRouterMock(
			{
				fullPath: '/workflow/1/abc123',
				name: VIEWS.WORKFLOW,
				params: { workflowId: '1', nodeId: 'abc123' },
				query: {},
			},
			resolveWorkflowRoute,
		);
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await handleSessionExpired(router, ownBackendURL);

		expect(resolveWorkflowRoute).not.toHaveBeenCalled();
		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent('/workflow/1/abc123'), sessionExpired: 'true' },
		});
		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
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
		const router = createRouterMock();
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await handleSessionExpired(router, ownBackendURL);

		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
	});

	it('only handles the first of several concurrent calls', async () => {
		const logout = vi.fn().mockResolvedValue({ redirectUrl: null });
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { id: '123' },
			logout,
		} as unknown as ReturnType<typeof useUsersStore>);
		const router = createRouterMock();
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		await Promise.all([
			handleSessionExpired(router, ownBackendURL),
			handleSessionExpired(router, ownBackendURL),
		]);

		expect(logout).toHaveBeenCalledTimes(1);
		expect(hrefSpy).toHaveBeenCalledTimes(1);
	});
});
