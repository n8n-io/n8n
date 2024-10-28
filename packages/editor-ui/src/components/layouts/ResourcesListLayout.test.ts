import { setActivePinia, createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import type router from 'vue-router';

vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRoute: () => ({
			params: {},
		}),
		useRouter: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(ResourcesListLayout);

describe('ResourcesListLayout', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should render loading skeleton', () => {
		const { container } = renderComponent({
			props: {
				loading: true,
			},
		});

		expect(container.querySelectorAll('.el-skeleton__p')).toHaveLength(25);
	});
});
