import { afterAll, beforeAll, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { setupServer } from '@/__tests__/server';
import VariablesView from '@/views/VariablesView.vue';
import { useSettingsStore, useUsersStore } from '@/stores';
import { renderComponent } from '@/__tests__/utils';

describe('VariablesView', () => {
	let server: ReturnType<typeof setupServer>;
	let pinia: ReturnType<typeof createPinia>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;

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

	it('should render loading state', () => {
		const wrapper = renderComponent(VariablesView, { pinia });

		expect(wrapper.container.querySelectorAll('.n8n-loading')).toHaveLength(3);
	});

	describe('should render empty state', () => {
		it('when feature is enabled and logged in user is owner', async () => {
			vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(true);
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
				isOwner: true,
			});

			const { queryByTestId } = renderComponent(VariablesView, { pinia });

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).toBeVisible();
				expect(queryByTestId('unavailable-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is disabled and logged in user is owner', async () => {
			vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(false);
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
				isOwner: true,
			});

			const { queryByTestId } = renderComponent(VariablesView, { pinia });

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).toBeVisible();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is eanbled and logged in user is not owner', async () => {
			vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(true);
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
				isDefaultUser: true,
			});

			const { queryByTestId } = renderComponent(VariablesView, { pinia });

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('cannot-create-variables')).toBeVisible();
			});
		});
	});

	it('should render variable entries', async () => {
		server.createList('variable', 3);

		const wrapper = renderComponent(VariablesView, { pinia });

		const table = await wrapper.findByTestId('resources-table');
		expect(table).toBeVisible();
		expect(wrapper.container.querySelectorAll('tr')).toHaveLength(4);
	});
});
