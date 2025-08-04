import { useRoute, useRouter } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useToast } from '@/composables/useToast';
import SignupView from '@/views/SignupView.vue';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
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

vi.mock('@/composables/useToast', () => {
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
	});

	it('should not throw error when opened', async () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should redirect to Signin when no inviterId and inviteeId', async () => {
		renderComponent();

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(router.replace).toHaveBeenCalledWith({ name: VIEWS.SIGNIN });
	});

	it('should validate signup token if there is any', async () => {
		route.query.inviterId = '123';
		route.query.inviteeId = '456';

		renderComponent();

		expect(usersStore.validateSignupToken).toHaveBeenCalledWith({
			inviterId: '123',
			inviteeId: '456',
		});
	});

	it('should not accept invitation when missing tokens', async () => {
		const { getByRole } = renderComponent();

		const acceptButton = getByRole('button', { name: 'Finish account setup' });

		await userEvent.click(acceptButton);

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(usersStore.acceptInvitation).not.toHaveBeenCalled();
	});

	it('should not accept invitation when form is unfilled', async () => {
		route.query.inviterId = '123';
		route.query.inviteeId = '456';

		const { getByRole } = renderComponent();

		const acceptButton = getByRole('button', { name: 'Finish account setup' });

		await userEvent.click(acceptButton);

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(usersStore.acceptInvitation).not.toHaveBeenCalled();
	});

	it('should accept invitation with tokens', async () => {
		route.query.inviterId = '123';
		route.query.inviteeId = '456';

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

		// TODO: Remove manual tabbing when the following issue is fixed (it should fail the test anyway)
		// https://github.com/testing-library/vue-testing-library/issues/317
		await userEvent.tab();
		expect(document.activeElement).toBe(firstNameInput);

		await userEvent.type(firstNameInput, 'Jane');
		await userEvent.type(lastNameInput, 'Doe');
		await userEvent.type(passwordInput, '324R435gfg5fgj!');

		await userEvent.click(acceptButton);

		expect(toast.showError).not.toHaveBeenCalled();
		expect(usersStore.acceptInvitation).toHaveBeenCalledWith({
			inviterId: '123',
			inviteeId: '456',
			firstName: 'Jane',
			lastName: 'Doe',
			password: '324R435gfg5fgj!',
		});
	});
});
