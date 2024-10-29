import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import SignupView from '@/views/SignupView.vue';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const replace = vi.fn();
	return {
		useRouter: () => ({
			push,
			replace,
		}),
		useRoute: () => ({
			query: {
				inviterId: '123',
				inviteeId: '456',
			},
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(SignupView);

describe('SignupView', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should not throw error when opened', () => {
		expect(() => renderComponent()).not.toThrow();
	});
});
