import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import ForgotMyPasswordView from '@/views/ForgotMyPasswordView.vue';
import { useToast } from '@/composables/useToast';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';

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
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

const renderComponent = createComponentRenderer(ForgotMyPasswordView, {
	global: {
		stubs: {
			'router-link': {
				template: '<a href="#"><slot /></a>',
			},
		},
	},
});

let toast: ReturnType<typeof useToast>;
let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

describe('ForgotMyPasswordView', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia();

		toast = useToast();
		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
	});

	it('should not throw error when opened', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should show email sending setup warning', async () => {
		const { getByRole, queryByRole } = renderComponent();

		const link = getByRole('link');
		const emailInput = queryByRole('textbox');

		expect(emailInput).not.toBeInTheDocument();
		expect(link).toBeVisible();
		expect(link).toHaveTextContent('Back to sign in');
	});

	it('should show form and submit', async () => {
		settingsStore.isSmtpSetup = true;
		usersStore.sendForgotPasswordEmail.mockResolvedValueOnce();

		const { getByRole } = renderComponent();

		const link = getByRole('link');
		const emailInput = getByRole('textbox');
		const submitButton = getByRole('button');

		expect(emailInput).toBeVisible();
		expect(link).toBeVisible();
		expect(link).toHaveTextContent('Back to sign in');

		// TODO: Remove manual tabbing when the following issue is fixed (it should fail the test anyway)
		// https://github.com/testing-library/vue-testing-library/issues/317
		await userEvent.tab();
		expect(document.activeElement).toBe(emailInput);

		await userEvent.type(emailInput, 'test@n8n.io');
		await userEvent.click(submitButton);

		expect(usersStore.sendForgotPasswordEmail).toHaveBeenCalledWith({
			email: 'test@n8n.io',
		});

		expect(toast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				title: expect.any(String),
				message: expect.any(String),
			}),
		);
	});

	it('should show form and error toast when submit has error', async () => {
		settingsStore.isSmtpSetup = true;
		usersStore.sendForgotPasswordEmail.mockRejectedValueOnce({
			httpStatusCode: 400,
		});

		const { getByRole } = renderComponent();

		const emailInput = getByRole('textbox');
		const submitButton = getByRole('button');

		await userEvent.type(emailInput, 'test@n8n.io');
		await userEvent.click(submitButton);

		expect(usersStore.sendForgotPasswordEmail).toHaveBeenCalledWith({
			email: 'test@n8n.io',
		});

		expect(toast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
			}),
		);
	});
});
