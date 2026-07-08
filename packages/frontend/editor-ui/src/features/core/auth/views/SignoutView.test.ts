import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { useRouter } from 'vue-router';
import SignoutView from './SignoutView.vue';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';

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
	beforeEach(() => {
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		ssoStore = mockedStore(useSSOStore);
		router = useRouter();

		usersStore.logout.mockResolvedValue({ redirectUrl: null });

		Object.defineProperty(window, 'location', {
			value: { href: '' },
			writable: true,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not throw error when opened', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should perform a standard logout and redirect to signin when OIDC is not the active authentication method', async () => {
		ssoStore.isDefaultAuthenticationOidc = false;
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		renderComponent();
		await flushPromises();

		expect(usersStore.logout).toHaveBeenCalledWith({ viaOidc: false });
		expect(router.resolve).toHaveBeenCalled();
		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
	});

	it('should sign out via OIDC and redirect to the RP-initiated logout URL when the backend returns one', async () => {
		const redirectUrl = 'https://idp.example.com/logout?id_token_hint=abc';
		ssoStore.isDefaultAuthenticationOidc = true;
		usersStore.logout.mockResolvedValue({ redirectUrl });
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		renderComponent();
		await flushPromises();

		expect(usersStore.logout).toHaveBeenCalledWith({ viaOidc: true });
		expect(hrefSpy).toHaveBeenCalledWith(redirectUrl);
		// Should redirect to the IdP, not resolve the local signin route.
		expect(router.resolve).not.toHaveBeenCalled();
	});

	it('should redirect to signin when signing out via OIDC but the session was not OIDC-established', async () => {
		ssoStore.isDefaultAuthenticationOidc = true;
		usersStore.logout.mockResolvedValue({ redirectUrl: null });
		const hrefSpy = vi.spyOn(window.location, 'href', 'set');

		renderComponent();
		await flushPromises();

		expect(usersStore.logout).toHaveBeenCalledWith({ viaOidc: true });
		expect(hrefSpy).toHaveBeenCalledWith(SIGNIN_HREF);
	});

	it('should show an error toast when logout fails', async () => {
		const error = new Error('logout failed');
		usersStore.logout.mockRejectedValueOnce(error);

		renderComponent();
		await flushPromises();

		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
	});
});
