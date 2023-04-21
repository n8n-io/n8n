import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { render } from '@testing-library/vue';
import VariablesView from '@/views/VariablesView.vue';
import { useSettingsStore, useUsersStore } from '@/stores';
import { renderComponent } from '@/__tests__/utils';

describe('store', () => {
	let server: ReturnType<typeof setupServer>;
	let pinia: ReturnType<typeof createPinia>;

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		await useSettingsStore().getSettings();
		await useUsersStore().fetchUsers();
		await useUsersStore().loginWithCookie();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render loading state', () => {
		const wrapper = renderComponent(VariablesView, { pinia });

		expect(wrapper.container.querySelectorAll('.n8n-loading')).toHaveLength(3);
	});

	it('should render empty state', async () => {
		const wrapper = renderComponent(VariablesView, { pinia });

		await wrapper.findByTestId('empty-resources-list');
		expect(wrapper.getByTestId('empty-resources-list')).toBeVisible();
	});

	it('should render variable entries', async () => {
		server.createList('variable', 3);

		const wrapper = renderComponent(VariablesView, { pinia });

		await wrapper.findByTestId('resources-table');
		expect(wrapper.getByTestId('resources-table')).toBeVisible();
		expect(wrapper.container.querySelectorAll('tr')).toHaveLength(4);
	});
});
