import { createTestingPinia } from '@pinia/testing';
import ChangePasswordModal from '@/components/ChangePasswordModal.vue';
import type { createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';

const renderComponent = createComponentRenderer(ChangePasswordModal);

describe('ChangePasswordModal', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		createAppModals();
		pinia = createTestingPinia({});
	});

	afterEach(() => {
		cleanupAppModals();
	});

	it('should render correctly', () => {
		const wrapper = renderComponent({ pinia });

		expect(wrapper.html()).toMatchSnapshot();
	});
});
