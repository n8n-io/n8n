import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import ChangePasswordView from './ChangePasswordView.vue';
import { useSettingsStore } from '@/app/stores/settings.store';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const replace = vi.fn();
	return {
		useRouter: () => ({
			push,
			replace,
			currentRoute: { value: { query: { token: 'test-token' } } },
		}),
		useRoute: () => ({
			query: { token: 'test-token' },
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

const renderComponent = createComponentRenderer(ChangePasswordView);

describe('ChangePasswordView', () => {
	it('should render correctly', () => {
		createTestingPinia();
		expect(() => renderComponent()).not.toThrow();
	});

	it('should default to 8-character minimum when passwordMinLength is not configured', async () => {
		const pinia = createTestingPinia();
		const settingsStore = mockedStore(useSettingsStore);
		delete (settingsStore.userManagement as { passwordMinLength?: number }).passwordMinLength;

		const { findByText } = renderComponent({ pinia });

		expect(await findByText(/8\+ characters/)).toBeInTheDocument();
	});

	it('should reflect configured passwordMinLength in password hint text', async () => {
		const pinia = createTestingPinia();
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.userManagement.passwordMinLength = 12;

		const { findByText } = renderComponent({ pinia });

		expect(await findByText(/12\+ characters/)).toBeInTheDocument();
	});
});
