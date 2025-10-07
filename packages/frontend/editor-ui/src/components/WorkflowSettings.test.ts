import { nextTick, reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { MockInstance } from 'vitest';
import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { FrontendSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, mockedStore, type MockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/constants';
import WorkflowSettingsVue from '@/components/WorkflowSettings.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';

vi.mock('vue-router', async () => ({
	useRouter: vi.fn(),
	useRoute: () =>
		reactive({
			params: {
				name: '1',
			},
		}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let pinia: ReturnType<typeof createTestingPinia>;

let searchWorkflowsSpy: MockInstance<(typeof workflowsStore)['searchWorkflows']>;

const createComponent = createComponentRenderer(WorkflowSettingsVue, {
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
		},
	},
});

describe('WorkflowSettingsVue', () => {
	beforeEach(async () => {
		pinia = createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		settingsStore = mockedStore(useSettingsStore);
		sourceControlStore = mockedStore(useSourceControlStore);

		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;
		workflowsStore.workflowName = 'Test Workflow';
		workflowsStore.workflowId = '1';
		searchWorkflowsSpy = workflowsStore.searchWorkflows.mockResolvedValue([
			{
				id: '1',
				name: 'Test Workflow',
				active: true,
				isArchived: false,
				nodes: [],
				connections: {},
				createdAt: 1,
				updatedAt: 1,
				versionId: '123',
			},
		]);
		workflowsStore.getWorkflowById.mockImplementation(() => ({
			id: '1',
			name: 'Test Workflow',
			active: true,
			isArchived: false,
			nodes: [],
			connections: {},
			createdAt: 1,
			updatedAt: 1,
			versionId: '123',
			scopes: ['workflow:update'],
		}));
	});

	afterEach(() => {
		vi.clearAllMocks();
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
		expect(searchWorkflowsSpy).toHaveBeenCalledTimes(1);
		expect(searchWorkflowsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: undefined,
			}),
		);
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

	it('should save time saved per execution correctly', async () => {
		const { getByTestId, getByRole } = createComponent({ pinia });
		await nextTick();

		const timeSavedPerExecutionInput = getByTestId('workflow-settings-time-saved-per-execution');

		expect(timeSavedPerExecutionInput).toBeVisible();

		await userEvent.type(timeSavedPerExecutionInput as Element, '10');
		expect(timeSavedPerExecutionInput).toHaveValue(10);

		await userEvent.click(getByRole('button', { name: 'Save' }));
		expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ settings: expect.objectContaining({ timeSavedPerExecution: 10 }) }),
		);
	});

	it('should remove time saved per execution setting', async () => {
		workflowsStore.workflowSettings.timeSavedPerExecution = 10;

		const { getByTestId, getByRole } = createComponent({ pinia });
		await nextTick();

		const timeSavedPerExecutionInput = getByTestId('workflow-settings-time-saved-per-execution');

		expect(timeSavedPerExecutionInput).toBeVisible();
		await waitFor(() => expect(timeSavedPerExecutionInput).toHaveValue(10));

		await userEvent.clear(timeSavedPerExecutionInput as Element);
		expect(timeSavedPerExecutionInput).not.toHaveValue();

		await userEvent.click(getByRole('button', { name: 'Save' }));
		expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				settings: expect.not.objectContaining({ timeSavedPerExecution: 10 }),
			}),
		);
	});

	it('should disable save time saved per execution if env is read-only', async () => {
		sourceControlStore.preferences.branchReadOnly = true;

		const { getByTestId } = createComponent({ pinia });
		await nextTick();

		const timeSavedPerExecutionInput = getByTestId('workflow-settings-time-saved-per-execution');

		expect(timeSavedPerExecutionInput).toBeVisible();
		expect(timeSavedPerExecutionInput).toBeDisabled();
	});

	it('should disable save time saved per execution if user has no permission to update workflow', async () => {
		workflowsStore.getWorkflowById.mockImplementation(() => ({
			id: '1',
			name: 'Test Workflow',
			active: true,
			isArchived: false,
			nodes: [],
			connections: {},
			createdAt: 1,
			updatedAt: 1,
			versionId: '123',
			scopes: ['workflow:read'],
		}));

		const { getByTestId } = createComponent({ pinia });
		await nextTick();

		const timeSavedPerExecutionInput = getByTestId('workflow-settings-time-saved-per-execution');

		expect(timeSavedPerExecutionInput).toBeVisible();
		expect(timeSavedPerExecutionInput).toBeDisabled();
	});
});
