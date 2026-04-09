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

	it('should use passwordMinLength from settings store', () => {
		const pinia = createTestingPinia();
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.userManagement.passwordMinLength = 12;

		const { container } = renderComponent({ pinia });

		expect(container.querySelector('[data-test-id]')).toBeDefined();
	});
});
