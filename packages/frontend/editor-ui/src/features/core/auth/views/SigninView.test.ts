import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { useRouter, useRoute } from 'vue-router';
import SigninView from './SigninView.vue';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { VIEWS } from '@/app/constants';
import { consumeSsoLoginRedirectSuppression } from '@/features/core/auth/ssoLoginRedirectSuppression';

vi.mock('@/features/core/auth/ssoLoginRedirectSuppression', () => ({
	consumeSsoLoginRedirectSuppression: vi.fn(() => false),
}));

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

	describe('when SSO is the active authentication method', () => {
		let ssoStore: ReturnType<typeof mockedStore<typeof useSSOStore>>;
		let route: ReturnType<typeof useRoute>;
		const SSO_URL = 'https://idp.example/login';

		beforeEach(() => {
			ssoStore = mockedStore(useSSOStore);
			ssoStore.showSsoLoginButton = true;
			ssoStore.redirectLoginToSso = true;
			ssoStore.resolveActiveSsoRedirectUrl = vi.fn().mockResolvedValue(SSO_URL);

			route = useRoute();
			global.window = Object.create(window);
			Object.defineProperty(window, 'location', {
				value: { href: '', origin: 'https://n8n.local' },
				writable: true,
			});
		});

		it('redirects to the SSO provider and hides the email/password form', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({});
			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			const { queryByTestId } = renderComponent();

			await waitFor(() => expect(hrefSpy).toHaveBeenCalledWith(SSO_URL));
			expect(queryByTestId('signin-form')).not.toBeInTheDocument();
		});

		it('shows the email/password form via the internal-auth fallback (?internalAuth=true)', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({ internalAuth: 'true' });
			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('signin-form')).toBeInTheDocument());
			expect(hrefSpy).not.toHaveBeenCalled();
			expect(ssoStore.resolveActiveSsoRedirectUrl).not.toHaveBeenCalled();
		});

		it('shows the email/password form when an admin disabled the SSO redirect', async () => {
			ssoStore.redirectLoginToSso = false;
			vi.spyOn(route, 'query', 'get').mockReturnValue({});
			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('signin-form')).toBeInTheDocument());
			expect(hrefSpy).not.toHaveBeenCalled();
		});

		it('does not redirect when an SSO error must be shown (avoids a redirect loop)', async () => {
			vi.spyOn(route, 'query', 'get').mockReturnValue({ ssoError: 'access-denied' });
			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('signin-form')).toBeInTheDocument());
			expect(hrefSpy).not.toHaveBeenCalled();
			expect(ssoStore.resolveActiveSsoRedirectUrl).not.toHaveBeenCalled();
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: "You don't have access to n8n", type: 'error' }),
			);
		});

		it('does not redirect right after a logout', async () => {
			vi.mocked(consumeSsoLoginRedirectSuppression).mockReturnValueOnce(true);
			vi.spyOn(route, 'query', 'get').mockReturnValue({});
			const hrefSpy = vi.spyOn(window.location, 'href', 'set');

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('signin-form')).toBeInTheDocument());
			expect(hrefSpy).not.toHaveBeenCalled();
			expect(ssoStore.resolveActiveSsoRedirectUrl).not.toHaveBeenCalled();
		});
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
});
