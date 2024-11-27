import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ConcurrentExecutionsHeader from '@/components/executions/ConcurrentExecutionsHeader.vue';

vi.mock('vue-router', () => {
	return {
		useRouter: vi.fn(),
		useRoute: vi.fn(),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(ConcurrentExecutionsHeader, {
	pinia: createTestingPinia(),
});

describe('ConcurrentExecutionsHeader', () => {
	it('should not throw error when rendered', async () => {
		expect(() =>
			renderComponent({
				props: {
					runningExecutionsCount: 0,
					concurrencyCap: 0,
				},
			}),
		).not.toThrow();
	});
});
