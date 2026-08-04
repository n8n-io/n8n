import { createTestingPinia } from '@pinia/testing';
import ChangePasswordModal from './ChangePasswordModal.vue';
import type { createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/app/stores/settings.store';
import { createPasswordRules } from '@n8n/design-system';

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual('@n8n/design-system');
	const { createPasswordRules: originalCreatePasswordRules } = actual as {
		createPasswordRules: typeof createPasswordRules;
	};
	return {
		...actual,
		createPasswordRules: vi.fn(originalCreatePasswordRules),
	};
});

const renderComponent = createComponentRenderer(ChangePasswordModal);

describe('ChangePasswordModal', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		pinia = createTestingPinia({});
		vi.mocked(createPasswordRules).mockClear();
	});

	it('should render correctly', () => {
		const wrapper = renderComponent({ pinia });

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should default to 8-character minimum when passwordMinLength is not configured', () => {
		const settingsStore = mockedStore(useSettingsStore);
		delete (settingsStore.userManagement as { passwordMinLength?: number }).passwordMinLength;

		renderComponent({ pinia });

		expect(createPasswordRules).toHaveBeenCalledWith(8);
	});

	it('should pass configured passwordMinLength to createPasswordRules', () => {
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.userManagement.passwordMinLength = 12;

		renderComponent({ pinia });

		expect(createPasswordRules).toHaveBeenCalledWith(12);
	});
});
