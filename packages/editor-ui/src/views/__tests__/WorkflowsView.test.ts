import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { setupServer } from '@/__tests__/server';
import WorkflowsView from '@/views/WorkflowsView.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';

describe('WorkflowsView', () => {
	let server: ReturnType<typeof setupServer>;
	let pinia: ReturnType<typeof createPinia>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;

	const renderComponent = createComponentRenderer(WorkflowsView, {
		global: {
			mocks: {
				$route: {
					query: {},
				},
				$router: {
					replace: vi.fn(),
				},
			},
		},
	});

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		await settingsStore.getSettings();
		await usersStore.fetchUsers();
		await usersStore.loginWithCookie();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render loading state', async () => {
		server.createList('workflow', 5);

		const { container, getAllByTestId, queryByTestId } = renderComponent({ pinia });

		expect(container.querySelectorAll('.n8n-loading')).toHaveLength(3);
		expect(queryByTestId('resources-list')).not.toBeInTheDocument();

		await waitFor(() => {
			expect(container.querySelectorAll('.n8n-loading')).toHaveLength(0);
			expect(getAllByTestId('resources-list-item')).toHaveLength(5);
		});
	});
});
