import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { VIEWS } from '@/app/constants';
import ConfirmEmailChangeView from './ConfirmEmailChangeView.vue';
import { useUsersStore } from '@n8n/stores/users.store';

const { push, replace, routerState } = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	routerState: { token: 'test-token' as string | undefined },
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push,
		replace,
		currentRoute: { value: { query: { token: routerState.token } } },
	}),
	RouterLink: { template: '<a><slot /></a>' },
}));

const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

const renderComponent = createComponentRenderer(ConfirmEmailChangeView);

describe('ConfirmEmailChangeView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		routerState.token = 'test-token';
	});

	it('should resolve the token and render the confirm card', async () => {
		const pinia = createTestingPinia();
		const usersStore = mockedStore(useUsersStore);
		usersStore.resolveEmailChangeToken.mockResolvedValue({ email: 'new@email.com' });

		const { findByTestId } = renderComponent({ pinia });

		expect(await findByTestId('confirm-email-change')).toHaveTextContent('new@email.com');
		expect(usersStore.resolveEmailChangeToken).toHaveBeenCalledWith({ token: 'test-token' });
	});

	it('should confirm the change and redirect to sign-in on submit', async () => {
		const pinia = createTestingPinia();
		const usersStore = mockedStore(useUsersStore);
		usersStore.resolveEmailChangeToken.mockResolvedValue({ email: 'new@email.com' });
		usersStore.confirmEmailChange.mockResolvedValue(undefined);
		usersStore.logout.mockResolvedValue({ redirectUrl: null });

		const { findByTestId } = renderComponent({ pinia });

		const button = await findByTestId('confirm-email-change-button');
		await fireEvent.click(button);

		await waitFor(() => {
			expect(usersStore.confirmEmailChange).toHaveBeenCalledWith({ token: 'test-token' });
			expect(usersStore.logout).toHaveBeenCalled();
			expect(push).toHaveBeenCalledWith({ name: VIEWS.SIGNIN });
		});
	});

	it('should redirect to sign-in when the token is invalid', async () => {
		const pinia = createTestingPinia();
		const usersStore = mockedStore(useUsersStore);
		usersStore.resolveEmailChangeToken.mockRejectedValue(new Error('invalid'));

		renderComponent({ pinia });

		await waitFor(() => {
			expect(replace).toHaveBeenCalledWith({ name: VIEWS.SIGNIN });
		});
	});

	it('should redirect to sign-in when the token is missing', async () => {
		routerState.token = undefined;
		const pinia = createTestingPinia();
		const usersStore = mockedStore(useUsersStore);

		renderComponent({ pinia });

		await waitFor(() => {
			expect(replace).toHaveBeenCalledWith({ name: VIEWS.SIGNIN });
		});
		expect(usersStore.resolveEmailChangeToken).not.toHaveBeenCalled();
	});
});
