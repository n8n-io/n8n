import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { useRouter } from 'vue-router';
import SignoutView from './SignoutView.vue';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useToast } from '@/app/composables/useToast';

const SIGNIN_HREF = '/signin';

vi.mock('vue-router', () => {
	const resolve = vi.fn(() => ({ href: SIGNIN_HREF }));
	return {
		useRouter: () => ({ resolve }),
		useRoute: vi.fn(),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const renderComponent = createComponentRenderer(SignoutView);

let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
let ssoStore: ReturnType<typeof mockedStore<typeof useSSOStore>>;
let router: ReturnType<typeof useRouter>;

describe('SignoutView', () => {
	const ORIGIN_URL = 'https://n8n.local';

	beforeEach(() => {
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		ssoStore = mockedStore(useSSOStore);
		router = useRouter();

		usersStore.logout.mockResolvedValue(undefined);

		global.window = Object.create(window);
		Object.defineProperty(window, 'location', {
			value: {
				href: '',
				origin: ORIGIN_URL,
			},
			writable: true,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not throw error when opened', () => {
		ssoStore.oidc = { loginEnabled: false, loginUrl: '', logoutUrl: '', callbackUrl: '' };

		expect(() => renderComponent()).not.toThrow();
	});

	it('should perform native logout and redirect to signin when no OIDC logout URL is configured', async () => {
		ssoStore.oidc = { loginEnabled: false, loginUrl: '', logoutUrl: '', callbackUrl: '' };
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		renderComponent();
		await flushPromises();

		expect(usersStore.logout).toHaveBeenCalledWith({ skipApiCall: false });
		expect(router.resolve).toHaveBeenCalled();
		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
	});

	it('should perform RP-initiated logout and redirect to the OIDC logout URL when configured', async () => {
		const oidcLogoutUrl = 'https://idp.example.com/logout';
		ssoStore.oidc = {
			loginEnabled: true,
			loginUrl: '',
			logoutUrl: oidcLogoutUrl,
			callbackUrl: '',
		};
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		renderComponent();
		await flushPromises();

		// The backend OIDC logout route already invalidates the session, so the
		// standard POST /logout API call must be skipped.
		expect(usersStore.logout).toHaveBeenCalledWith({ skipApiCall: true });
		expect(hrefSpy).toHaveBeenCalledWith(oidcLogoutUrl);
		// Should redirect to the IdP, not resolve the local signin route.
		expect(router.resolve).not.toHaveBeenCalled();
	});

	it('should show an error toast when logout fails', async () => {
		ssoStore.oidc = { loginEnabled: false, loginUrl: '', logoutUrl: '', callbackUrl: '' };
		const error = new Error('logout failed');
		usersStore.logout.mockRejectedValueOnce(error);

		renderComponent();
		await flushPromises();

		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
	});
});
