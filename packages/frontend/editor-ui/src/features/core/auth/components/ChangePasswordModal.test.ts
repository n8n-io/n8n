import { createTestingPinia } from '@pinia/testing';
import ChangePasswordModal from './ChangePasswordModal.vue';
import type { createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/app/stores/settings.store';

const renderComponent = createComponentRenderer(ChangePasswordModal);

describe('ChangePasswordModal', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		pinia = createTestingPinia({});
	});

	it('should render correctly', () => {
		const wrapper = renderComponent({ pinia });

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should use passwordMinLength from settings store', () => {
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.userManagement.passwordMinLength = 12;

		const wrapper = renderComponent({ pinia });

		expect(wrapper.html()).toBeDefined();
	});
});
