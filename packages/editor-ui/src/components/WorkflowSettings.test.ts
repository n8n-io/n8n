import { createPinia, setActivePinia } from 'pinia';
import WorkflowSettingsVue from '@/components/WorkflowSettings.vue';

import { setupServer } from '@/__tests__/server';
import type { MockInstance } from 'vitest';
import { afterAll, beforeAll } from 'vitest';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';

import { createComponentRenderer } from '@/__tests__/render';
import { cleanupAppModals, createAppModals, getDropdownItems } from '@/__tests__/utils';
import { EnterpriseEditionFeature, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';

import { nextTick } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import * as permissions from '@/permissions';
import type { PermissionsRecord } from '@/permissions';

let pinia: ReturnType<typeof createPinia>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let uiStore: ReturnType<typeof useUIStore>;

let fetchAllWorkflowsSpy: MockInstance<(typeof workflowsStore)['fetchAllWorkflows']>;

const createComponent = createComponentRenderer(WorkflowSettingsVue);

describe('WorkflowSettingsVue', () => {
	let server: ReturnType<typeof setupServer>;
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		createAppModals();

		workflowsStore = useWorkflowsStore();
		settingsStore = useSettingsStore();
		uiStore = useUIStore();

		await settingsStore.getSettings();

		vi.spyOn(workflowsStore, 'workflowName', 'get').mockReturnValue('Test Workflow');
		vi.spyOn(workflowsStore, 'workflowId', 'get').mockReturnValue('1');
		fetchAllWorkflowsSpy = vi.spyOn(workflowsStore, 'fetchAllWorkflows').mockResolvedValue([
			{
				id: '1',
				name: 'Test Workflow',
				active: true,
				nodes: [],
				connections: {},
				createdAt: 1,
				updatedAt: 1,
				versionId: '123',
			},
		]);
		vi.spyOn(workflowsStore, 'getWorkflowById').mockReturnValue({
			id: '1',
			name: 'Test Workflow',
			active: true,
			nodes: [],
			connections: {},
			createdAt: 1,
			updatedAt: 1,
			versionId: '123',
		} as IWorkflowDb);
		vi.spyOn(permissions, 'getResourcePermissions').mockReturnValue({
			workflow: {
				update: true,
			},
		} as PermissionsRecord);

		uiStore.modalsById[WORKFLOW_SETTINGS_MODAL_KEY] = {
			open: true,
		};
	});

	afterEach(() => {
		cleanupAppModals();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render correctly', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = false;
		const { getByTestId } = createComponent({ pinia });
		await nextTick();
		expect(getByTestId('workflow-settings-dialog')).toBeVisible();
	});

	it('should not render workflow caller policy when sharing is not enabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = false;
		const { getByTestId } = createComponent({ pinia });

		await nextTick();

		expect(
			within(getByTestId('workflow-settings-dialog')).queryByTestId('workflow-caller-policy'),
		).not.toBeInTheDocument();
	});

	it('should render workflow caller policy when sharing is enabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const { getByTestId } = createComponent({ pinia });

		await nextTick();

		expect(getByTestId('workflow-caller-policy')).toBeVisible();
	});

	it('should render list of workflows field when policy is set to workflowsFromAList', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const { getByTestId } = createComponent({ pinia });

		await nextTick();
		const dropdownItems = await getDropdownItems(getByTestId('workflow-caller-policy'));
		await userEvent.click(dropdownItems[2]);

		expect(getByTestId('workflow-caller-policy-workflow-ids')).toBeVisible();
	});

	it('should fetch all workflows and render them in the error workflows dropdown', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const { getByTestId } = createComponent({ pinia });

		await nextTick();
		const dropdownItems = await getDropdownItems(getByTestId('error-workflow'));

		// first is `- No Workflow -`, second is the workflow returned by
		// `workflowsStore.fetchAllWorkflows`
		expect(dropdownItems).toHaveLength(2);
		expect(fetchAllWorkflowsSpy).toHaveBeenCalledTimes(1);
		expect(fetchAllWorkflowsSpy).toHaveBeenCalledWith();
	});

	it('should not remove valid workflow ID characters', async () => {
		const validWorkflowList = '1234567890, abcde, efgh, 1234';

		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const { getByTestId } = createComponent({ pinia });

		await nextTick();

		const dropdownItems = await getDropdownItems(getByTestId('workflow-caller-policy'));
		await userEvent.click(dropdownItems[2]);

		await userEvent.type(getByTestId('workflow-caller-policy-workflow-ids'), validWorkflowList);

		expect(getByTestId('workflow-caller-policy-workflow-ids')).toHaveValue(validWorkflowList);
	});

	it('should remove invalid workflow ID characters', async () => {
		const invalidWorkflowList = '1234567890@, abc/de, ef*gh, 12%34';
		const cleanedUpWorkflowList = '1234567890, abcde, efgh, 1234';

		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const { getByTestId } = createComponent({ pinia });

		await nextTick();

		const dropdownItems = await getDropdownItems(getByTestId('workflow-caller-policy'));
		await userEvent.click(dropdownItems[2]);

		await userEvent.type(getByTestId('workflow-caller-policy-workflow-ids'), invalidWorkflowList);

		expect(getByTestId('workflow-caller-policy-workflow-ids')).toHaveValue(cleanedUpWorkflowList);
	});

	test.each([
		['workflow-settings-save-failed-executions', 'Default - Save', () => {}],
		[
			'workflow-settings-save-failed-executions',
			'Default - Do not save',
			() => {
				settingsStore.saveDataErrorExecution = 'none';
			},
		],
		['workflow-settings-save-success-executions', 'Default - Save', () => {}],
		[
			'workflow-settings-save-success-executions',
			'Default - Do not save',
			() => {
				settingsStore.saveDataSuccessExecution = 'none';
			},
		],
		[
			'workflow-settings-save-manual-executions',
			'Default - Save',
			() => {
				settingsStore.saveManualExecutions = true;
			},
		],
		['workflow-settings-save-manual-executions', 'Default - Do not save', () => {}],
		[
			'workflow-settings-save-execution-progress',
			'Default - Save',
			() => {
				settingsStore.saveDataProgressExecution = true;
			},
		],
		['workflow-settings-save-execution-progress', 'Default - Do not save', () => {}],
	])(
		'should show %s dropdown correct default value as %s',
		async (testId, optionText, storeSetter) => {
			storeSetter();
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(getByTestId(testId));

			expect(dropdownItems[0]).toHaveTextContent(optionText);
		},
	);
});
