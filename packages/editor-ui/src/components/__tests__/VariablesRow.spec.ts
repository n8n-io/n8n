import VariablesRow from '../VariablesRow.vue';
import type { EnvironmentVariable } from '@/Interface';
import { fireEvent } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { afterAll, beforeAll } from 'vitest';
import { useSettingsStore, useUsersStore } from '@/stores';
import { renderComponent } from '@/__tests__/utils';

describe('VariablesRow', () => {
	let server: ReturnType<typeof setupServer>;
	let pinia: ReturnType<typeof createPinia>;

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		await useSettingsStore().getSettings();
		await useUsersStore().loginWithCookie();
	});

	afterAll(() => {
		server.shutdown();
	});

	const stubs = ['n8n-tooltip'];

	const environmentVariable: EnvironmentVariable = {
		id: 1,
		key: 'key',
		value: 'value',
	};

	it('should render correctly', () => {
		const wrapper = renderComponent(VariablesRow, {
			props: {
				data: environmentVariable,
			},
			stubs,
			pinia,
		});

		expect(wrapper.html()).toMatchSnapshot();
		expect(wrapper.container.querySelectorAll('td')).toHaveLength(4);
	});

	it('should show edit and delete buttons on hover', async () => {
		const wrapper = renderComponent(VariablesRow, {
			props: {
				data: environmentVariable,
			},
			stubs,
			pinia,
		});

		await fireEvent.mouseEnter(wrapper.container);

		expect(wrapper.getByTestId('variable-row-edit-button')).toBeVisible();
		expect(wrapper.getByTestId('variable-row-delete-button')).toBeVisible();
	});

	it('should show key and value inputs in edit mode', async () => {
		const wrapper = renderComponent(VariablesRow, {
			props: {
				data: environmentVariable,
				editing: true,
			},
			stubs,
			pinia,
		});

		await fireEvent.mouseEnter(wrapper.container);

		expect(wrapper.getByTestId('variable-row-key-input')).toBeVisible();
		expect(wrapper.getByTestId('variable-row-key-input').querySelector('input')).toHaveValue(
			environmentVariable.key,
		);
		expect(wrapper.getByTestId('variable-row-value-input')).toBeVisible();
		expect(wrapper.getByTestId('variable-row-value-input').querySelector('input')).toHaveValue(
			environmentVariable.value,
		);

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should show cancel and save buttons in edit mode', async () => {
		const wrapper = renderComponent(VariablesRow, {
			props: {
				data: environmentVariable,
				editing: true,
			},
			stubs,
			pinia,
		});

		await fireEvent.mouseEnter(wrapper.container);

		expect(wrapper.getByTestId('variable-row-cancel-button')).toBeVisible();
		expect(wrapper.getByTestId('variable-row-save-button')).toBeVisible();
	});
});
