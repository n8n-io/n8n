import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useRouter, useRoute } from 'vue-router';
import SigninView from './SigninView.vue';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { VIEWS } from '@/app/constants';
import { SSO_LOGIN_REQUIRED_ERROR_CODE } from '@n8n/api-types';

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

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

const showMessage = vi.fn();
const showError = vi.fn();
const clearAllStickyNotifications = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError, clearAllStickyNotifications }),
}));

const renderComponent = createComponentRenderer(SigninView);

let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let notificationsStore: ReturnType<typeof mockedStore<typeof useNotificationsStore>>;
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
		notificationsStore = mockedStore(useNotificationsStore);
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

	it('should show a session expired toast when the sessionExpired query parameter is set', () => {
		const route = useRoute();
		vi.spyOn(route, 'query', 'get').mockReturnValue({
			redirect: '/home/workflows',
			sessionExpired: 'true',
		});

		renderComponent();

		expect(showMessage).toHaveBeenCalledWith({
			title: 'Session expired',
			message: 'Your session has expired. Please log in again to continue using n8n.',
			type: 'info',
		});
		// Stepped around suppression to show this toast, then put it right back.
		expect(notificationsStore.setNotificationsSuppressed.mock.calls).toEqual([[false], [true]]);
	});

	it('should not show a session expired toast when the sessionExpired query parameter is absent', () => {
		renderComponent();

		expect(showMessage).not.toHaveBeenCalled();
	});

	it('should show a no-access toast when the SSO login was denied by role mapping', () => {
		const route = useRoute();
		vi.spyOn(route, 'query', 'get').mockReturnValue({
			ssoError: 'access-denied',
		});

		renderComponent();

		expect(showMessage).toHaveBeenCalledWith({
			title: "You don't have access to n8n",
			message:
				'Your role or permissions do not currently give you access to n8n. Please speak to your administrator if you think this is incorrect.',
			type: 'error',
			duration: 0,
		});
		expect(notificationsStore.setNotificationsSuppressed.mock.calls).toEqual([[false], [true]]);
	});

	it('should show an error toast when the SSO login failed', () => {
		const route = useRoute();
		vi.spyOn(route, 'query', 'get').mockReturnValue({
			ssoError: 'login-failed',
		});

		renderComponent();

		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'error', duration: 0 }),
		);
		expect(notificationsStore.setNotificationsSuppressed.mock.calls).toEqual([[false], [true]]);
	});

	it('should not render the SSO card when SSO is not the login method', () => {
		const { queryByTestId, getByTestId } = renderComponent();

		expect(getByTestId('auth-form')).toBeInTheDocument();
		expect(queryByTestId('sso-signin-card')).not.toBeInTheDocument();
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

	it('should unsuppress notifications as soon as a login attempt is submitted', async () => {
		await signInWithValidUser();

		expect(notificationsStore.setNotificationsSuppressed).toHaveBeenCalledWith(false);
	});

	it('should unsuppress notifications when leaving via a route other than a login attempt', () => {
		const { unmount } = renderComponent();

		unmount();

		expect(notificationsStore.setNotificationsSuppressed).toHaveBeenCalledWith(false);
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

	describe('when SSO is the active login method', () => {
		let route: ReturnType<typeof useRoute>;

		const getEmailInput = (container: Element) => container.querySelector('input[type="email"]');

		const submitPasswordLogin = async (
			container: Element,
			getByRole: ReturnType<typeof renderComponent>['getByRole'],
		) => {
			const emailInput = getEmailInput(container);
			const passwordInput = container.querySelector('input[type="password"]');
			if (!emailInput || !passwordInput) {
				throw new Error('Inputs not found');
			}

			await userEvent.type(emailInput, 'member@n8n.io');
			await userEvent.type(passwordInput, 'password');
			await userEvent.click(getByRole('button', { name: 'Sign in' }));
		};

		beforeEach(() => {
			route = useRoute();
			ssoStore.showSsoLoginButton = true;
			settingsStore.isCloudDeployment = false;
			settingsStore.activeModules = [];

			Object.defineProperty(window, 'location', {
				value: { href: '', origin: 'https://n8n.local' },
				writable: true,
			});
		});

		it('should lead with the SSO button and keep the password form collapsed', () => {
			const { getByTestId, getByRole, queryByTestId, container } = renderComponent();

			expect(getByTestId('sso-signin-card')).toBeInTheDocument();
			expect(queryByTestId('auth-form')).not.toBeInTheDocument();
			expect(getByRole('button', { name: 'Continue with SSO' })).toBeVisible();
			expect(getEmailInput(container)).not.toBeInTheDocument();
		});

		it('should reveal the password form when internalAuth=true is in the URL', () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({ internalAuth: 'true' });

			const { container } = renderComponent();

			expect(getEmailInput(container)).toBeVisible();
		});

		it('should redirect to the SAML identity provider from the SSO button', async () => {
			ssoStore.isDefaultAuthenticationSaml = true;
			ssoStore.getSSORedirectUrl.mockResolvedValue('https://idp.example.com/saml');
			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			const { getByRole } = renderComponent();
			await userEvent.click(getByRole('button', { name: 'Continue with SSO' }));

			expect(ssoStore.getSSORedirectUrl).toHaveBeenCalledWith('/home/workflows');
			expect(hrefSpy).toHaveBeenCalledWith('https://idp.example.com/saml');
		});

		it('should redirect to the OIDC login URL from the SSO button', async () => {
			ssoStore.isDefaultAuthenticationSaml = false;
			ssoStore.oidc = { loginEnabled: true, loginUrl: '/rest/sso/oidc/login', callbackUrl: '' };
			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			const { getByRole } = renderComponent();
			await userEvent.click(getByRole('button', { name: 'Continue with SSO' }));

			expect(ssoStore.getSSORedirectUrl).not.toHaveBeenCalled();
			expect(hrefSpy).toHaveBeenCalledWith('/rest/sso/oidc/login');
		});

		it('should show a toast when the SSO redirect URL cannot be resolved', async () => {
			ssoStore.isDefaultAuthenticationSaml = true;
			ssoStore.getSSORedirectUrl.mockRejectedValue(new Error('SAML is not configured'));

			const { getByRole } = renderComponent();
			await userEvent.click(getByRole('button', { name: 'Continue with SSO' }));

			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Problem logging in');
		});

		it('should show an inline callout instead of a toast when password sign-in requires SSO', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({ internalAuth: 'true' });
			usersStore.loginWithCreds.mockRejectedValueOnce(
				Object.assign(new Error('SSO is enabled, please log in with SSO'), {
					errorCode: SSO_LOGIN_REQUIRED_ERROR_CODE,
				}),
			);

			const { getByRole, getByTestId, queryByTestId, container } = renderComponent();
			expect(queryByTestId('sso-required-callout')).not.toBeInTheDocument();

			await submitPasswordLogin(container, getByRole);

			expect(getByTestId('sso-required-callout')).toBeVisible();
			expect(showError).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith('User attempted to login', {
				result: 'credentials_error',
			});
		});

		it('should still show a toast for other login errors', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({ internalAuth: 'true' });
			usersStore.loginWithCreds.mockRejectedValueOnce(
				Object.assign(new Error('Wrong username or password'), { errorCode: 401 }),
			);

			const { getByRole, queryByTestId, container } = renderComponent();

			await submitPasswordLogin(container, getByRole);

			expect(queryByTestId('sso-required-callout')).not.toBeInTheDocument();
			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Problem logging in');
		});
	});
});
