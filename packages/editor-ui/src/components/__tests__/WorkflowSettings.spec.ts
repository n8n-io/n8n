import { createPinia, setActivePinia } from 'pinia';
import WorkflowSettingsVue from '../WorkflowSettings.vue';

import { setupServer } from '@/__tests__/server';
import { afterAll, beforeAll } from 'vitest';
import { within, fireEvent } from '@testing-library/vue';

import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';

import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';

import { nextTick } from 'vue';

let pinia: ReturnType<typeof createPinia>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let uiStore: ReturnType<typeof useUIStore>;

const createComponent = createComponentRenderer(WorkflowSettingsVue, {
	global: {
		stubs: ['n8n-tooltip'],
	},
});

describe('WorkflowSettingsVue', () => {
	let server: ReturnType<typeof setupServer>;
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		settingsStore = useSettingsStore();
		uiStore = useUIStore();

		await settingsStore.getSettings();

		vi.spyOn(workflowsStore, 'workflowName', 'get').mockReturnValue('Test Workflow');
		vi.spyOn(workflowsStore, 'workflowId', 'get').mockReturnValue('1');
		vi.spyOn(workflowsStore, 'workflow', 'get').mockReturnValue({
			id: '1',
			name: 'Test Workflow',
			active: true,
			nodes: [],
			connections: {},
			createdAt: 1,
			updatedAt: 1,
			versionId: '123',
		} as IWorkflowDb);

		uiStore.modals[WORKFLOW_SETTINGS_MODAL_KEY] = {
			open: true,
		};
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render correctly', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = false;
		const wrapper = createComponent({ pinia });
		await nextTick();
		expect(wrapper.getByTestId('workflow-settings-dialog')).toBeVisible();
	});

	it('should not render workflow caller policy when sharing is not enabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = false;
		const wrapper = createComponent({ pinia });

		await nextTick();

		expect(
			within(wrapper.getByTestId('workflow-settings-dialog')).queryByTestId(
				'workflow-caller-policy',
			),
		).not.toBeInTheDocument();
	});

	it('should render workflow caller policy when sharing is enabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const wrapper = createComponent({ pinia });

		await nextTick();

		expect(wrapper.getByTestId('workflow-caller-policy')).toBeVisible();
	});

	it('should render list of workflows field when policy is set to workflowsFromAList', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const wrapper = createComponent({ pinia });

		await nextTick();

		await fireEvent.click(wrapper.getByTestId('workflow-caller-policy'));
		console.log(window.document.querySelectorAll('.el-select-dropdown__item')[4].innerHTML);
		await fireEvent.click(window.document.querySelectorAll('.el-select-dropdown__item')[4]);

		expect(wrapper.getByTestId('workflow-caller-policy-workflow-ids')).toBeVisible();
	});

	it('should not remove valid workflow ID characters', async () => {
		const validWorkflowList = '1234567890, abcde, efgh, 1234';

		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const wrapper = createComponent({ pinia });

		await nextTick();

		await fireEvent.click(wrapper.getByTestId('workflow-caller-policy'));
		console.log(window.document.querySelectorAll('.el-select-dropdown__item')[4].innerHTML);
		await fireEvent.click(window.document.querySelectorAll('.el-select-dropdown__item')[4]);

		await fireEvent.update(
			wrapper.getByTestId('workflow-caller-policy-workflow-ids'),
			validWorkflowList,
		);

		expect(wrapper.getByTestId('workflow-caller-policy-workflow-ids')).toHaveValue(
			validWorkflowList,
		);
	});

	it('should remove invalid workflow ID characters', async () => {
		const invalidWorkflowList = '1234567890@, abc/de, ef*gh, 12%34';
		const cleanedUpWorkflowList = '1234567890, abcde, efgh, 1234';

		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const wrapper = createComponent({ pinia });

		await nextTick();

		await fireEvent.click(wrapper.getByTestId('workflow-caller-policy'));
		console.log(window.document.querySelectorAll('.el-select-dropdown__item')[4].innerHTML);
		await fireEvent.click(window.document.querySelectorAll('.el-select-dropdown__item')[4]);

		await fireEvent.update(
			wrapper.getByTestId('workflow-caller-policy-workflow-ids'),
			invalidWorkflowList,
		);

		expect(wrapper.getByTestId('workflow-caller-policy-workflow-ids')).toHaveValue(
			cleanedUpWorkflowList,
		);
	});
});
