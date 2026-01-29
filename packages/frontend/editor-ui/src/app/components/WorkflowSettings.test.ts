import { nextTick, reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { MockInstance } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { FrontendSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflow } from '@/__tests__/mocks';
import { getDropdownItems, mockedStore, type MockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import WorkflowSettingsVue from '@/app/components/WorkflowSettings.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import * as restApiClient from '@n8n/rest-api-client';
import { mock } from 'vitest-mock-extended';
import { BINARY_MODE_COMBINED } from 'n8n-workflow';

const toast = {
	showMessage: vi.fn(),
	showError: vi.fn(),
};

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => toast,
}));

vi.mock('vue-router', async () => ({
	useRouter: vi.fn(),
	useRoute: () =>
		reactive({
			params: {
				name: '1',
			},
			query: {},
		}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@n8n/rest-api-client', async (importOriginal) => {
	const actual = await importOriginal<typeof restApiClient>();
	return {
		...actual,
		getCredentialResolvers: vi.fn(),
	};
});

let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let pinia: ReturnType<typeof createTestingPinia>;

let searchWorkflowsSpy: MockInstance<(typeof workflowsListStore)['searchWorkflows']>;

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
		workflowsListStore = mockedStore(useWorkflowsListStore);
		settingsStore = mockedStore(useSettingsStore);
		sourceControlStore = mockedStore(useSourceControlStore);

		settingsStore.settings = mock<FrontendSettings>({
			enterprise: {},
			envFeatureFlags: {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
			},
			releaseChannel: 'stable',
		});
		workflowsStore.workflowName = 'Test Workflow';
		workflowsStore.workflowId = '1';
		// Populate workflowsById to mark workflow as existing (not new)
		const testWorkflow = createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			active: true,
			scopes: ['workflow:update'],
		});
		workflowsListStore.workflowsById = { '1': testWorkflow };
		searchWorkflowsSpy = workflowsListStore.searchWorkflows.mockResolvedValue([testWorkflow]);
		workflowsListStore.getWorkflowById.mockImplementation(() => testWorkflow);
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

	describe('Error Workflow', () => {
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
					query: undefined,
				}),
			);
		});

		it('should initialize undefined errorWorkflow to DEFAULT', async () => {
			workflowsStore.workflowSettings = {
				executionOrder: 'v1',
			};

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(getByTestId('error-workflow'));
			expect(dropdownItems[0]).toHaveTextContent('No Workflow');

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ errorWorkflow: 'DEFAULT' }),
				}),
			);
		});

		it('should send DEFAULT value for errorWorkflow to backend when set to "No Workflow"', async () => {
			workflowsStore.workflowSettings = {
				executionOrder: 'v1',
				errorWorkflow: 'some-workflow-id',
			};

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(getByTestId('error-workflow'));

			// Select "No Workflow" (first option)
			await userEvent.click(dropdownItems[0]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ errorWorkflow: 'DEFAULT' }),
				}),
			);
		});

		it('should save workflow with errorWorkflow when a specific workflow is selected', async () => {
			workflowsStore.workflowSettings = {
				executionOrder: 'v1',
			};

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(getByTestId('error-workflow'));

			// Select the test workflow (second option)
			await userEvent.click(dropdownItems[1]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ errorWorkflow: '1' }),
				}),
			);
		});
	});

	it('should not remove valid workflow ID characters including hyphens and underscores', async () => {
		const validWorkflowList =
			'1234567890, abcde, efgh, 1234, luPpn77f_KhU1e-F9bQXu, another-valid_id';

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
		workflowsStore.workflowSettings.timeSavedMode = 'fixed';
		const { getByTestId, getByRole } = createComponent({ pinia });
		await nextTick();
		await waitFor(() => {
			expect(getByTestId('workflow-settings-time-saved-per-execution')).toBeVisible();
		});

		const timeSavedPerExecutionInput = getByTestId(
			'workflow-settings-time-saved-per-execution',
		)?.querySelector('input[type="number"]');

		await userEvent.type(timeSavedPerExecutionInput as Element, '10');
		expect(timeSavedPerExecutionInput).toHaveValue(10);

		await userEvent.click(getByRole('button', { name: 'Save' }));
		expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ settings: expect.objectContaining({ timeSavedPerExecution: 10 }) }),
		);
	});

	it('should remove time saved per execution setting', async () => {
		workflowsStore.workflowSettings.timeSavedMode = 'fixed';
		workflowsStore.workflowSettings.timeSavedPerExecution = 10;

		const { getByTestId, getByRole } = createComponent({ pinia });
		await nextTick();
		await waitFor(() => {
			expect(getByTestId('workflow-settings-time-saved-per-execution')).toBeVisible();
		});

		const timeSavedPerExecutionInput = getByTestId(
			'workflow-settings-time-saved-per-execution',
		)?.querySelector('input[type="number"]');
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
		workflowsStore.workflowSettings.timeSavedMode = 'fixed';
		sourceControlStore.preferences.branchReadOnly = true;

		const { getByTestId } = createComponent({ pinia });
		await nextTick();
		await waitFor(() => {
			expect(getByTestId('workflow-settings-time-saved-per-execution')).toBeVisible();
		});

		const timeSavedPerExecutionInput = getByTestId(
			'workflow-settings-time-saved-per-execution',
		)?.querySelector('input[type="number"]');

		expect(timeSavedPerExecutionInput).toBeDisabled();
	});

	it('should disable save time saved per execution if user has no permission to update workflow', async () => {
		workflowsStore.workflowSettings.timeSavedMode = 'fixed';

		const readOnlyWorkflow = createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			active: true,
			scopes: ['workflow:read'],
		});
		workflowsListStore.workflowsById = { '1': readOnlyWorkflow };
		workflowsListStore.getWorkflowById.mockImplementation(() => readOnlyWorkflow);

		const { getByTestId } = createComponent({ pinia });
		await nextTick();
		await waitFor(() => {
			expect(getByTestId('workflow-settings-time-saved-per-execution')).toBeVisible();
		});

		const timeSavedPerExecutionInput = getByTestId(
			'workflow-settings-time-saved-per-execution',
		)?.querySelector('input[type="number"]');

		expect(timeSavedPerExecutionInput).toBeDisabled();
	});

	describe('Execution Order & Binary Mode', () => {
		it('should render execution order dropdown with correct options', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-execution-order'),
			);

			expect(dropdownItems.length).toBeGreaterThanOrEqual(2);
			expect(dropdownItems[0]).toHaveTextContent(
				'Executes the first node of each branch, then the second node of each branch, and so on.',
			);
			expect(dropdownItems[1]).toHaveTextContent(
				'Executes each branch in turn, from topmost to bottommost, completing one branch before starting another.',
			);
		});

		it('should set binaryMode to separate when selecting v0', async () => {
			workflowsStore.workflowSettings.executionOrder = 'v1';
			workflowsStore.workflowSettings.binaryMode = BINARY_MODE_COMBINED;

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-execution-order'),
			);
			await userEvent.click(dropdownItems[0]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({
						executionOrder: 'v0',
						binaryMode: 'separate',
					}),
				}),
			);
		});

		it('should set binaryMode to separate when selecting v1', async () => {
			workflowsStore.workflowSettings.executionOrder = 'v0';
			workflowsStore.workflowSettings.binaryMode = BINARY_MODE_COMBINED;

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-execution-order'),
			);
			await userEvent.click(dropdownItems[1]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({
						executionOrder: 'v1',
						binaryMode: 'separate',
					}),
				}),
			);
		});

		it('should show binary mode warning toast when binary mode changes', async () => {
			workflowsStore.workflowSettings.executionOrder = 'v1';
			workflowsStore.workflowSettings.binaryMode = BINARY_MODE_COMBINED;

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-execution-order'),
			);
			await userEvent.click(dropdownItems[0]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			await waitFor(() => {
				expect(toast.showMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Execution Logic changed',
						type: 'warning',
						duration: 0,
					}),
				);
			});
		});

		it('should not show warning when binary mode does not change', async () => {
			workflowsStore.workflowSettings.executionOrder = 'v0';
			workflowsStore.workflowSettings.binaryMode = 'separate';

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			toast.showMessage.mockClear();

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-execution-order'),
			);
			await userEvent.click(dropdownItems[1]);

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(toast.showMessage).not.toHaveBeenCalled();
		});

		it('should default to v1 execution order when not set', async () => {
			workflowsStore.workflowSettings = {
				executionOrder: 'v1',
			};

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-execution-order'),
			);

			expect(dropdownItems[1]).toHaveTextContent('v1');
		});

		it('should disable execution order dropdown when environment is read-only', async () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const executionOrderDropdown = within(
				getByTestId('workflow-settings-execution-order'),
			).getByRole('combobox');

			expect(executionOrderDropdown).toBeDisabled();
		});

		it('should disable execution order dropdown when user has no update permission', async () => {
			workflowsListStore.getWorkflowById.mockImplementation(() => ({
				id: '1',
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
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

			const executionOrderDropdown = within(
				getByTestId('workflow-settings-execution-order'),
			).getByRole('combobox');

			expect(executionOrderDropdown).toBeDisabled();
		});
	});

	describe('Credential Resolver', () => {
		const mockResolvers = [
			{
				id: 'resolver-1',
				name: 'Test Resolver 1',
				type: 'test-type',
				config: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 'resolver-2',
				name: 'Test Resolver 2',
				type: 'test-type',
				config: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];

		beforeEach(() => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);
		});

		it('should render credential resolver dropdown', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('workflow-settings-credential-resolver')).toBeVisible();
		});

		it('should load credential resolvers on mount', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-credential-resolver'),
			);

			// Should have 2 resolvers
			expect(dropdownItems).toHaveLength(2);
			expect(dropdownItems[0]).toHaveTextContent('Test Resolver 1');
			expect(dropdownItems[1]).toHaveTextContent('Test Resolver 2');
		});

		it('should show "New" button for creating a new resolver', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(getByTestId('workflow-settings-credential-resolver-create-new')).toBeInTheDocument();
			});
		});

		it('should not show "Edit" button when no resolver is selected', async () => {
			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(queryByTestId('workflow-settings-credential-resolver-edit')).not.toBeInTheDocument();
			});
		});

		it('should show "Edit" button when a resolver is selected', async () => {
			workflowsStore.workflowSettings.credentialResolverId = 'resolver-1';

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(getByTestId('workflow-settings-credential-resolver-edit')).toBeInTheDocument();
			});
		});

		it('should select a resolver from dropdown', async () => {
			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-credential-resolver'),
			);

			// Select "Test Resolver 1"
			await userEvent.click(dropdownItems[0]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			const callArgs = workflowsStore.updateWorkflow.mock.calls[0];
			expect(callArgs[0]).toBe('1');
			expect(callArgs[1].settings?.credentialResolverId).toBe('resolver-1');
		});

		it('should save workflow with selected resolver', async () => {
			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-credential-resolver'),
			);

			// Select "Test Resolver 2"
			await userEvent.click(dropdownItems[1]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			const callArgs = workflowsStore.updateWorkflow.mock.calls[0];
			expect(callArgs[0]).toBe('1');
			expect(callArgs[1].settings?.credentialResolverId).toBe('resolver-2');
		});

		it('should disable credential resolver dropdown when environment is read-only', async () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const dropdownContainer = getByTestId('workflow-settings-credential-resolver');
			const input = dropdownContainer.querySelector('input');
			expect(input).toBeDisabled();
		});

		it('should disable credential resolver dropdown when user has no update permission', async () => {
			workflowsListStore.getWorkflowById.mockImplementation(() => ({
				id: '1',
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
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

			const dropdownContainer = getByTestId('workflow-settings-credential-resolver');
			const input = dropdownContainer.querySelector('input');
			expect(input).toBeDisabled();
		});
	});
});
