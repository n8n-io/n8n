import RBAC from '@/components/RBAC.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useRBACStore } from '@/stores/rbac.store';

const renderComponent = createComponentRenderer(RBAC);

vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => ({
		path: '/workflows',
		params: {},
	})),
	RouterLink: vi.fn(),
}));

vi.mock('@/stores/rbac.store', () => ({
	useRBACStore: vi.fn(),
}));

describe('RBAC', () => {
	it('renders default slot when hasScope is true', async () => {
		vi.mocked(useRBACStore).mockImplementation(
			() =>
				({
					hasScope: () => true,
				}) as unknown as ReturnType<typeof useRBACStore>,
		);

		const wrapper = renderComponent({
			props: { scope: 'worfklow:list' },
			slots: {
				default: 'Default Content',
				fallback: 'Fallback Content',
			},
		});

		expect(wrapper.getByText('Default Content')).toBeInTheDocument();
	});

	it('renders fallback slot when hasScope is false', async () => {
		vi.mocked(useRBACStore).mockImplementation(
			() =>
				({
					hasScope: () => false,
				}) as unknown as ReturnType<typeof useRBACStore>,
		);

		const wrapper = renderComponent({
			props: { scope: 'worfklow:list' },
			slots: {
				default: 'Default Content',
				fallback: 'Fallback Content',
			},
		});

		expect(wrapper.getByText('Fallback Content')).toBeInTheDocument();
	});
});
