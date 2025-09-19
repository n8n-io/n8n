import { createTestingPinia } from '@pinia/testing';
import ChangePasswordModal from '@/components/ChangePasswordModal.vue';
import type { createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';

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
});
