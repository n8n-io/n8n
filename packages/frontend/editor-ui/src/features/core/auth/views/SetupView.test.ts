import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router';
import SetupView from './SetupView.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const replace = vi.fn();
	return {
		useRouter: () => ({
			push,
			replace,
		}),
		useRoute: () => ({
			query: {},
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

const renderComponent = createComponentRenderer(SetupView);

describe('SetupView', () => {
	it('should render correctly', () => {
		createTestingPinia();
		expect(() => renderComponent()).not.toThrow();
	});

	it('should default to 8-character minimum when passwordMinLength is not configured', () => {
		const pinia = createTestingPinia();
		const settingsStore = mockedStore(useSettingsStore);
		delete (settingsStore.userManagement as { passwordMinLength?: number }).passwordMinLength;

		const { getByText } = renderComponent({ pinia });

		expect(getByText(/8\+ characters/)).toBeInTheDocument();
	});

	it('should reflect configured passwordMinLength in password hint text', () => {
		const pinia = createTestingPinia();
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.userManagement.passwordMinLength = 12;

		const { getByText } = renderComponent({ pinia });

		expect(getByText(/12\+ characters/)).toBeInTheDocument();
	});

	it('should route a forced-here new owner through root so the guard can land them on Instance AI', async () => {
		const pinia = createTestingPinia();
		const settingsStore = mockedStore(useSettingsStore);
		const usersStore = mockedStore(useUsersStore);
		settingsStore.userManagement.showSetupOnFirstLoad = true;
		usersStore.createOwner.mockResolvedValueOnce(undefined);

		const { getByRole, container } = renderComponent({ pinia });

		await userEvent.type(container.querySelector('input[type="email"]')!, 'owner@n8n.io');
		await userEvent.type(container.querySelector('input[name="firstName"]')!, 'Jane');
		await userEvent.type(container.querySelector('input[name="lastName"]')!, 'Doe');
		await userEvent.type(container.querySelector('input[type="password"]')!, '324R435gfg5fgj!');
		await userEvent.click(getByRole('button', { name: 'Next' }));

		expect(usersStore.createOwner).toHaveBeenCalled();
		expect(useRouter().push).toHaveBeenCalledWith('/');
	});
});
