import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { setupServer } from '@/__tests__/server';
import WorkflowsView from '@/views/WorkflowsView.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '@/stores/projects.store';

const originalOffsetHeight = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	'offsetHeight',
) as PropertyDescriptor;

describe('WorkflowsView', () => {
	let server: ReturnType<typeof setupServer>;
	let pinia: ReturnType<typeof createPinia>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let projectsStore: ReturnType<typeof useProjectsStore>;

	const renderComponent = createComponentRenderer(WorkflowsView, {
		global: {
			mocks: {
				$route: {
					query: {},
					params: {},
				},
				$router: {
					replace: vi.fn(),
				},
			},
		},
	});

	beforeAll(() => {
		Object.defineProperties(HTMLElement.prototype, {
			offsetHeight: {
				get() {
					return this.getAttribute('data-test-id') === 'resources-list' ? 1000 : 100;
				},
			},
		});

		server = setupServer();
	});

	afterAll(() => {
		Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		projectsStore = useProjectsStore();

		vi.spyOn(projectsStore, 'getAllProjects').mockImplementation(async () => {});

		await settingsStore.getSettings();
		await usersStore.fetchUsers();
		await usersStore.loginWithCookie();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should filter workflows by tags', async () => {
		const { container, getByTestId, getAllByTestId, queryByTestId } = renderComponent({
			pinia,
		});

		expect(container.querySelectorAll('.n8n-loading')).toHaveLength(3);
		expect(queryByTestId('resources-list')).not.toBeInTheDocument();

		await waitFor(() => {
			expect(container.querySelectorAll('.n8n-loading')).toHaveLength(0);
			// There are 5 workflows defined in server fixtures
			expect(getAllByTestId('resources-list-item')).toHaveLength(5);
		});

		await userEvent.click(
			getAllByTestId('resources-list-item')[0].querySelector('.n8n-tag') as HTMLElement,
		);
		await waitFor(() => {
			expect(getAllByTestId('resources-list-item').length).toBeLessThan(5);
		});

		await userEvent.click(getByTestId('workflows-filter-reset'));
		await waitFor(() => {
			expect(getAllByTestId('resources-list-item')).toHaveLength(5);
		});

		await userEvent.click(
			getAllByTestId('resources-list-item')[3].querySelector('.n8n-tag') as HTMLElement,
		);
		await waitFor(() => {
			expect(getAllByTestId('resources-list-item').length).toBeLessThan(5);
		});
	});
});
