import WorkflowSettingsVue from '../WorkflowSettings.vue';
import type { EnvironmentVariable, IWorkflowDataUpdate } from '@/Interface';
import { fireEvent } from '@testing-library/vue';
import { setupServer } from '@/__tests__/server';
import { afterAll, beforeAll } from 'vitest';

import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { STORES, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';

let rootStore: ReturnType<typeof useRootStore>;
let workflowsEEStore: ReturnType<typeof useWorkflowsEEStore>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;

const renderComponent = createComponentRenderer(WorkflowSettingsVue, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modals: {
					[WORKFLOW_SETTINGS_MODAL_KEY]: {
						open: true,
					},
				},
			},
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: true,
					},
				},
			},
		},
	}),
	global: {
		stubs: ['n8n-tooltip'],
	},
});

const workflowDataUpdate: IWorkflowDataUpdate = {
	id: '1',
	name: 'Test Workflow',
	nodes: [],
	connections: {},
	tags: [],
	active: true,
};

describe('WorkflowSettingsVue', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		await useSettingsStore().getSettings();
		await useUsersStore().loginWithCookie();
		rootStore = useRootStore();
		workflowsEEStore = useWorkflowsEEStore();
		workflowsStore = useWorkflowsStore();
		vi.spyOn(workflowsStore, 'workflowName', 'get').mockResolvedValue(workflowDataUpdate.name!);
		vi.spyOn(workflowsStore, 'workflowId', 'get').mockResolvedValue(workflowDataUpdate.id!);
	});

	afterAll(() => {
		server.shutdown();
	});

	it.only('should render correctly', () => {
		const wrapper = renderComponent({
			props: {
				data: workflowDataUpdate,
			},
		});
		expect(wrapper.getByTestId('workflow-settings-dialog')).toBeVisible();
	});

	it('should show edit and delete buttons on hover', async () => {
		const wrapper = renderComponent({
			props: {
				data: workflowDataUpdate,
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
