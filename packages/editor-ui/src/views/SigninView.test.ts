import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import SigninView from '@/views/SigninView.vue';

const renderComponent = createComponentRenderer(SigninView);

describe('SigninView', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should not throw error when opened', () => {
		expect(() => renderComponent()).not.toThrow();
	});
});
