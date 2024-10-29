import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ForgotMyPasswordView from '@/views/ForgotMyPasswordView.vue';

const renderComponent = createComponentRenderer(ForgotMyPasswordView);

describe('ForgotMyPasswordView', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should not throw error when opened', () => {
		expect(() => renderComponent()).not.toThrow();
	});
});
