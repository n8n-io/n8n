import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { useRouter, useRoute } from 'vue-router';
import SigninView from './SigninView.vue';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { VIEWS } from '@/app/constants';

vi.mock('vue-router', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
		}),
		useRoute: vi.fn().mockReturnValue({
			query: {
				redirect: '/home/workflows',
			},
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

vi.mock('@/app/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

const renderComponent = createComponentRenderer(SigninView);

let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let ssoStore: ReturnType<typeof mockedStore<typeof useSSOStore>>;

let router: ReturnType<typeof useRouter>;
let telemetry: ReturnType<typeof useTelemetry>;

describe('SigninView', () => {
	const signInWithValidUser = async () => {
		settingsStore.isCloudDeployment = false;
		settingsStore.activeModules = [];
		usersStore.loginWithCreds.mockResolvedValueOnce();

		const { getByRole, queryByTestId, container } = renderComponent();
		const emailInput = container.querySelector('input[type="email"]');
		const passwordInput = container.querySelector('input[type="password"]');
		const submitButton = getByRole('button', { name: 'Sign in' });

		if (!emailInput || !passwordInput) {
			throw new Error('Inputs not found');
		}

		expect(queryByTestId('mfa-login-form')).not.toBeInTheDocument();

		expect(emailInput).toBeVisible();
		expect(passwordInput).toBeVisible();

		// TODO: Remove manual tabbing when the following issue is fixed (it should fail the test anyway)
		// https://github.com/testing-library/vue-testing-library/issues/317
		await userEvent.tab();
		expect(document.activeElement).toBe(emailInput);

		await userEvent.type(emailInput, 'test@n8n.io');
		await userEvent.type(passwordInput, 'password');

		await userEvent.click(submitButton);
	};

	beforeEach(() => {
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
		ssoStore = mockedStore(useSSOStore);

		router = useRouter();
		telemetry = useTelemetry();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not throw error when opened', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should show and submit email/password form (happy path)', async () => {
		await signInWithValidUser();

		expect(usersStore.loginWithCreds).toHaveBeenCalledWith({
			emailOrLdapLoginId: 'test@n8n.io',
			password: 'password',
			mfaCode: undefined,
			mfaRecoveryCode: undefined,
		});

		expect(telemetry.track).toHaveBeenCalledWith('User attempted to login', {
			result: 'success',
		});

		expect(router.push).toHaveBeenCalledWith('/home/workflows');
	});

	describe('when redirect query parameter is set', () => {
		const ORIGIN_URL = 'https://n8n.local';
		let route: ReturnType<typeof useRoute>;

		beforeEach(() => {
			route = useRoute();
			global.window = Object.create(window);

			Object.defineProperty(window, 'location', {
				value: {
					href: '',
					origin: ORIGIN_URL,
				},
				writable: true,
			});
		});

		it('should redirect to homepage with router if redirect url does not contain the origin domain', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({
				redirect: 'https://n8n.local.evil.com',
			});

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			await signInWithValidUser();

			expect(hrefSpy).not.toHaveBeenCalled();
			expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should redirect to homepage with router if redirect url does not contain a valid URL', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({
				redirect: 'not-a-valid-url',
			});

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			await signInWithValidUser();

			expect(hrefSpy).not.toHaveBeenCalled();
			expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should redirect to given route if redirect url contains the origin domain', async () => {
			const validRedirectUrl = 'https://n8n.local/valid-redirect';
			vi.spyOn(route, 'query', 'get').mockReturnValue({
				redirect: validRedirectUrl,
			});

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			await signInWithValidUser();

			expect(hrefSpy).toHaveBeenCalledWith(validRedirectUrl);
			expect(router.push).not.toHaveBeenCalled();
		});

		it('should redirect with router to given route if redirect url is a local path', async () => {
			const validLocalRedirectUrl = '/valid-redirect';
			vi.spyOn(route, 'query', 'get').mockReturnValue({
				redirect: validLocalRedirectUrl,
			});

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			await signInWithValidUser();

			expect(hrefSpy).not.toHaveBeenCalled();
			expect(router.push).toHaveBeenCalledWith(validLocalRedirectUrl);
		});

		it('should redirect to homepage with router if redirect url is empty', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({
				redirect: '',
			});

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			await signInWithValidUser();

			expect(hrefSpy).not.toHaveBeenCalled();
			expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});
	});

	describe('SSO auto-redirect', () => {
		let route: ReturnType<typeof useRoute>;

		beforeEach(() => {
			route = useRoute();
			global.window = Object.create(window);
			Object.defineProperty(window, 'location', {
				value: { href: '', origin: 'https://n8n.local' },
				writable: true,
			});
		});

		it('should auto-redirect to SAML IdP when SAML is default auth', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({});
			ssoStore.showSsoLoginButton = true;
			ssoStore.isDefaultAuthenticationSaml = true;
			ssoStore.getSSORedirectUrl.mockResolvedValue('https://idp.example.com/saml');

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');
			const { getByTestId } = renderComponent();

			await vi.waitFor(() => {
				expect(hrefSpy).toHaveBeenCalledWith('https://idp.example.com/saml');
			});

			expect(getByTestId('sso-redirecting')).toBeInTheDocument();
		});

		it('should auto-redirect to OIDC when OIDC is default auth', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({});
			ssoStore.showSsoLoginButton = true;
			ssoStore.isDefaultAuthenticationSaml = false;
			ssoStore.oidc = { loginEnabled: true, loginUrl: 'https://idp.example.com/oidc' };

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');
			const { getByTestId } = renderComponent();

			await vi.waitFor(() => {
				expect(hrefSpy).toHaveBeenCalledWith('https://idp.example.com/oidc');
			});

			expect(getByTestId('sso-redirecting')).toBeInTheDocument();
		});

		it('should NOT auto-redirect when noSsoRedirect query param is present', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({ noSsoRedirect: '' });
			ssoStore.showSsoLoginButton = true;
			ssoStore.isDefaultAuthenticationSaml = true;

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');
			const { queryByTestId, getByTestId } = renderComponent();

			await vi.dynamicImportSettled();

			expect(hrefSpy).not.toHaveBeenCalled();
			expect(queryByTestId('sso-redirecting')).not.toBeInTheDocument();
			expect(getByTestId('signin-form')).toBeInTheDocument();
		});

		it('should fall back to login form on redirect failure', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({});
			settingsStore.isCloudDeployment = false;
			settingsStore.activeModules = [];
			ssoStore.showSsoLoginButton = true;
			ssoStore.isDefaultAuthenticationSaml = true;
			ssoStore.getSSORedirectUrl.mockRejectedValue(new Error('SSO unavailable'));

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');
			const { getByTestId, queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('sso-redirecting')).not.toBeInTheDocument();
				expect(getByTestId('signin-form')).toBeInTheDocument();
			});

			expect(hrefSpy).not.toHaveBeenCalled();
		});

		it('should NOT auto-redirect when SSO is not default auth', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({});
			ssoStore.showSsoLoginButton = false;

			const hrefSpy = vi.spyOn(window.location, 'href', 'set');
			const { queryByTestId, getByTestId } = renderComponent();

			await vi.dynamicImportSettled();

			expect(hrefSpy).not.toHaveBeenCalled();
			expect(queryByTestId('sso-redirecting')).not.toBeInTheDocument();
			expect(getByTestId('signin-form')).toBeInTheDocument();
		});
	});
});
