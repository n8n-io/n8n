import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { ADD_APP_MODAL_KEY } from './apps.constants';

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: () => ({ isOverviewSubPage: false }),
}));

import AppsView from './AppsView.vue';

const renderView = createComponentRenderer(AppsView);

describe('AppsView', () => {
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let uiStore: MockedStore<typeof useUIStore>;

	beforeEach(() => {
		createTestingPinia();
		projectsStore = mockedStore(useProjectsStore);
		uiStore = mockedStore(useUIStore);
		projectsStore.currentProject = { id: 'proj-1' } as Project;
	});

	it('shows the hero empty state with a "Create app" CTA', async () => {
		const { findByTestId } = renderView();
		const emptyState = await findByTestId('apps-empty-state');
		expect(within(emptyState).getByRole('button', { name: 'Create app' })).toBeInTheDocument();
	});

	it('opens the same "Add app" modal as the header button when the hero CTA is clicked', async () => {
		const { findByTestId } = renderView();
		const emptyState = await findByTestId('apps-empty-state');
		await userEvent.click(within(emptyState).getByRole('button', { name: 'Create app' }));

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: ADD_APP_MODAL_KEY,
			data: { projectId: 'proj-1' },
		});
	});
});
