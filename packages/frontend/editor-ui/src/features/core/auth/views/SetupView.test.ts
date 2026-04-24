import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import SetupView from './SetupView.vue';
import { useSettingsStore } from '@/app/stores/settings.store';

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
});
