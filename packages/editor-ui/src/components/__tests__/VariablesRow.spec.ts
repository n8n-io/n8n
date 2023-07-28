import VariablesRow from '../VariablesRow.vue';
import type { EnvironmentVariable } from '@/Interface';
import { fireEvent } from '@testing-library/vue';
import { setupServer } from '@/__tests__/server';
import { afterAll, beforeAll } from 'vitest';
import { useSettingsStore, useUsersStore } from '@/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@/constants';

const renderComponent = createComponentRenderer(VariablesRow, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						variables: true,
					},
				},
			},
		},
	}),
	global: {
		stubs: ['n8n-tooltip'],
	},
});

describe('VariablesRow', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		await useSettingsStore().getSettings();
		await useUsersStore().loginWithCookie();
	});

	afterAll(() => {
		server.shutdown();
	});

	const environmentVariable: EnvironmentVariable = {
		id: 1,
		key: 'key',
		value: 'value',
	};

	it('should render correctly', () => {
		const wrapper = renderComponent({
			props: {
				data: environmentVariable,
			},
		});

		expect(wrapper.container.querySelectorAll('td')).toHaveLength(4);
	});

	it('should show edit and delete buttons on hover', async () => {
		const wrapper = renderComponent({
			props: {
				data: environmentVariable,
			},
		});

		await fireEvent.mouseEnter(wrapper.container);

		expect(wrapper.getByTestId('variable-row-edit-button')).toBeVisible();
		expect(wrapper.getByTestId('variable-row-delete-button')).toBeVisible();
	});

	it('should show key and value inputs in edit mode', async () => {
		const wrapper = renderComponent({
			props: {
				data: environmentVariable,
				editing: true,
			},
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
	});

	it('should show cancel and save buttons in edit mode', async () => {
		const wrapper = renderComponent({
			props: {
				data: environmentVariable,
				editing: true,
			},
		});

		await fireEvent.mouseEnter(wrapper.container);

		expect(wrapper.getByTestId('variable-row-cancel-button')).toBeVisible();
		expect(wrapper.getByTestId('variable-row-save-button')).toBeVisible();
	});
});
