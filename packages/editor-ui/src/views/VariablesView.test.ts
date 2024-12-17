import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { setupServer } from '@/__tests__/server';
import VariablesView from '@/views/VariablesView.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useRBACStore } from '@/stores/rbac.store';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature, STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';

describe('VariablesView', () => {
	let server: ReturnType<typeof setupServer>;
	let pinia: ReturnType<typeof createPinia>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let rbacStore: ReturnType<typeof useRBACStore>;

	const renderComponent = createComponentRenderer(VariablesView, {
		pinia: createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
			},
		}),
	});

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		rbacStore = useRBACStore();
		await settingsStore.getSettings();
		await usersStore.fetchUsers();
		await usersStore.loginWithCookie();
	});

	afterAll(() => {
		server.shutdown();
	});

	describe('should render empty state', () => {
		it('when feature is disabled and logged in user is not owner', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = false;
			rbacStore.setGlobalScopes(['variable:read', 'variable:list']);

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).toBeVisible();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is disabled and logged in user is owner', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = false;
			rbacStore.setGlobalScopes([
				'variable:create',
				'variable:read',
				'variable:update',
				'variable:delete',
				'variable:list',
			]);

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).toBeVisible();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is enabled and logged in user is owner', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;
			rbacStore.setGlobalScopes([
				'variable:create',
				'variable:read',
				'variable:update',
				'variable:delete',
				'variable:list',
			]);

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is enabled and logged in user is not owner', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;
			rbacStore.setGlobalScopes(['variable:read', 'variable:list']);

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('cannot-create-variables')).toBeVisible();
			});
		});
	});

	it('should render variable entries', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;
		server.createList('variable', 3);

		const wrapper = renderComponent({ pinia });

		const table = await wrapper.findByTestId('resources-table');
		expect(table).toBeVisible();
		expect(wrapper.container.querySelectorAll('tr')).toHaveLength(4);
	});
});
