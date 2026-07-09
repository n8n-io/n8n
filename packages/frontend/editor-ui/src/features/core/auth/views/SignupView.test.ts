import { useRoute, useRouter } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useToast } from '@/app/composables/useToast';
import SignupView from './SignupView.vue';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { mockedStore } from '@/__tests__/utils';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const replace = vi.fn();
	const query = {};
	return {
		useRouter: () => ({
			push,
			replace,
		}),
		useRoute: () => ({
			query,
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	return {
		useToast: () => ({
			showError,
		}),
	};
});

const renderComponent = createComponentRenderer(SignupView);

let route: ReturnType<typeof useRoute>;
let router: ReturnType<typeof useRouter>;
let toast: ReturnType<typeof useToast>;
let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

describe('SignupView', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia();

		route = useRoute();
		router = useRouter();
		toast = useToast();

		usersStore = mockedStore(useUsersStore);

		// Clear route query between tests
		Object.keys(route.query).forEach((key) => {
			delete route.query[key];
		});
	});

	it('should not throw error when opened', async () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should redirect to Signin when no token in URL', async () => {
		renderComponent();

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(router.replace).toHaveBeenCalledWith({ name: VIEWS.SIGNIN });
	});

	it('should validate signup token if there is any', async () => {
		const mockToken = 'test-signup-token';
		route.query.token = mockToken;

		usersStore.validateSignupToken.mockResolvedValueOnce({
			inviter: {
				firstName: 'John',
				lastName: 'Doe',
			},
		});

		renderComponent();

		expect(usersStore.validateSignupToken).toHaveBeenCalledWith({
			token: mockToken,
		});
	});

	it('should not accept invitation when missing token', async () => {
		const { getByRole } = renderComponent();

		const acceptButton = getByRole('button', { name: 'Finish account setup' });

		await userEvent.click(acceptButton);

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(usersStore.acceptInvitation).not.toHaveBeenCalled();
	});

	it('should not accept invitation when form is unfilled', async () => {
		route.query.token = 'test-token';

		usersStore.validateSignupToken.mockResolvedValueOnce({
			inviter: {
				firstName: 'John',
				lastName: 'Doe',
			},
		});

		const { getByRole } = renderComponent();

		const acceptButton = getByRole('button', { name: 'Finish account setup' });

		await userEvent.click(acceptButton);

		// Form validation may prevent submit; either way acceptInvitation must not be called
		expect(usersStore.acceptInvitation).not.toHaveBeenCalled();
	});

	it('should validate signup token with JWT token', async () => {
		const mockToken =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZpdGVySWQiOiIxMjMiLCJpbnZpdGVlSWQiOiI0NTYifQ.test';
		route.query.token = mockToken;

		usersStore.validateSignupToken.mockResolvedValueOnce({
			inviter: {
				firstName: 'John',
				lastName: 'Doe',
			},
		});

		renderComponent();

		expect(usersStore.validateSignupToken).toHaveBeenCalledWith({
			token: mockToken,
		});
	});

	it('should show error and redirect when URL has only legacy inviterId and inviteeId (no token)', async () => {
		route.query.inviterId = '123';
		route.query.inviteeId = '456';

		renderComponent();

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(router.replace).toHaveBeenCalledWith({ name: VIEWS.SIGNIN });
		expect(usersStore.validateSignupToken).not.toHaveBeenCalled();
		expect(usersStore.acceptInvitation).not.toHaveBeenCalled();
	});

	it('should accept invitation with JWT token', async () => {
		const mockToken =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZpdGVySWQiOiIxMjMiLCJpbnZpdGVlSWQiOiI0NTYifQ.test';
		// beforeEach already clears the query, so we just set what we need
		route.query.token = mockToken;

		usersStore.validateSignupToken.mockResolvedValueOnce({
			inviter: {
				firstName: 'John',
				lastName: 'Doe',
			},
		});

		const { getByRole, container } = renderComponent();

		const acceptButton = getByRole('button', { name: 'Finish account setup' });

		const firstNameInput = container.querySelector('input[name="firstName"]');
		const lastNameInput = container.querySelector('input[name="lastName"]');
		const passwordInput = container.querySelector('input[type="password"]');

		if (!firstNameInput || !lastNameInput || !passwordInput) {
			throw new Error('Inputs not found');
		}

		await userEvent.type(firstNameInput, 'Jane');
		await userEvent.type(lastNameInput, 'Doe');
		await userEvent.type(passwordInput, '324R435gfg5fgj!');

		await userEvent.click(acceptButton);

		expect(toast.showError).not.toHaveBeenCalled();
		expect(usersStore.acceptInvitation).toHaveBeenCalledTimes(1);
		const payload = usersStore.acceptInvitation.mock.calls[0][0];
		expect(payload).toMatchObject({
			token: mockToken,
			firstName: 'Jane',
			lastName: 'Doe',
			password: '324R435gfg5fgj!',
		});
		// IAM-403: invite acceptance is token-only; must not send legacy params
		expect(payload).not.toHaveProperty('inviterId');
		expect(payload).not.toHaveProperty('inviteeId');
	});

	it('should default to 8-character minimum when passwordMinLength is not configured', () => {
		const settingsStore = mockedStore(useSettingsStore);
		delete (settingsStore.userManagement as { passwordMinLength?: number }).passwordMinLength;

		const { getByText } = renderComponent();

		expect(getByText(/8\+ characters/)).toBeInTheDocument();
	});

	it('should reflect configured passwordMinLength in password hint text', () => {
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.userManagement.passwordMinLength = 12;

		const { getByText } = renderComponent();

		expect(getByText(/12\+ characters/)).toBeInTheDocument();
	});

	it('should show error and redirect when URL has inviterId but no token', async () => {
		route.query.inviterId = '123';

		renderComponent();

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(router.replace).toHaveBeenCalledWith({ name: VIEWS.SIGNIN });
		expect(usersStore.acceptInvitation).not.toHaveBeenCalled();
	});
});
