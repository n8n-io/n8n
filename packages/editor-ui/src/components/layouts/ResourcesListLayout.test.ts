import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { within, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import type router from 'vue-router';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/stores/projects.store';
import type { Project } from '@/types/projects.types';

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
		const pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	it('should render loading skeleton', () => {
		const { container } = renderComponent({
			props: {
				loading: true,
			},
		});

		expect(container.querySelectorAll('.el-skeleton__p')).toHaveLength(25);
	});

	describe('header', () => {
		it('should render the correct icon', async () => {
			const projects = mockedStore(useProjectsStore);
			const { getByTestId } = renderComponent();

			expect(getByTestId('list-layout-header').querySelector('.fa-home')).toBeVisible();

			projects.currentProject = { type: 'personal' } as Project;

			await waitFor(() =>
				expect(getByTestId('list-layout-header').querySelector('.fa-user')).toBeVisible(),
			);

			const projectName = 'My Project';
			projects.currentProject = { name: projectName } as Project;

			await waitFor(() =>
				expect(getByTestId('list-layout-header').querySelector('.fa-layer-group')).toBeVisible(),
			);
		});

		it('should render the correct title', async () => {
			const projects = mockedStore(useProjectsStore);
			const { getByTestId } = renderComponent();

			expect(within(getByTestId('list-layout-header')).getByText('Home')).toBeVisible();

			projects.currentProject = { type: 'personal' } as Project;

			await waitFor(() =>
				expect(within(getByTestId('list-layout-header')).getByText('Personal')).toBeVisible(),
			);

			const projectName = 'My Project';
			projects.currentProject = { name: projectName } as Project;

			await waitFor(() =>
				expect(within(getByTestId('list-layout-header')).getByText(projectName)).toBeVisible(),
			);
		});

		it('should render subtitle', () => {
			const { getByTestId } = renderComponent();

			expect(
				within(getByTestId('list-layout-header')).getByText(
					'All the workflows, credentials, variables and executions you have access to',
				),
			).toBeVisible();
		});
	});
});
