import { nextTick, reactive } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import type { MockInstance } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { FrontendSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflow } from '@/__tests__/mocks';
import { getDropdownItems, mockedStore, type MockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useRBACStore } from '@/app/stores/rbac.store';
import WorkflowSettingsVue from '@/app/components/WorkflowSettings.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import * as restApiClient from '@n8n/rest-api-client';
import { mock } from 'vitest-mock-extended';
import { BINARY_MODE_COMBINED } from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

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
		getCredentialResolverTypes: vi.fn().mockResolvedValue([]),
	};
});

let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let pinia: ReturnType<typeof createTestingPinia>;

let searchWorkflowsSpy: MockInstance<(typeof workflowsListStore)['searchWorkflows']>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

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
		pinia = createTestingPinia({ stubActions: false });
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		settingsStore = mockedStore(useSettingsStore);
		sourceControlStore = mockedStore(useSourceControlStore);

		// Mock specific store actions that tests assert on
		workflowsStore.updateWorkflow = vi.fn();
		workflowsListStore.fetchWorkflow = vi.fn();

		// Create document store on the main pinia (same one the component uses).
		// With stubActions: false, setSettings and getSettingsSnapshot work normally.
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('1'));

		settingsStore.settings = mock<FrontendSettings>({
			enterprise: {},
			envFeatureFlags: {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
			},
			activeModules: ['dynamic-credentials'],
			releaseChannel: 'stable',
		});
		vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
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
			workflowDocumentStore.setSettings({
				executionOrder: 'v1',
			});

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
			workflowDocumentStore.setSettings({
				executionOrder: 'v1',
				errorWorkflow: 'some-workflow-id',
			});

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
			workflowDocumentStore.setSettings({
				executionOrder: 'v1',
			});

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
		workflowDocumentStore.setSettings({ timeSavedMode: 'fixed' });
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
		workflowDocumentStore.setSettings({ timeSavedMode: 'fixed', timeSavedPerExecution: 10 });

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
		workflowDocumentStore.setSettings({ timeSavedMode: 'fixed' });
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
		workflowDocumentStore.setSettings({ timeSavedMode: 'fixed' });

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
			workflowDocumentStore.setSettings({ executionOrder: 'v1', binaryMode: BINARY_MODE_COMBINED });

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
			workflowDocumentStore.setSettings({ executionOrder: 'v0', binaryMode: BINARY_MODE_COMBINED });

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
			workflowDocumentStore.setSettings({ executionOrder: 'v1', binaryMode: BINARY_MODE_COMBINED });

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
			workflowDocumentStore.setSettings({ executionOrder: 'v0', binaryMode: 'separate' });

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
			workflowDocumentStore.setSettings({
				executionOrder: 'v1',
			});

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
				type: 'editable-type',
				config: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 'resolver-2',
				name: 'Test Resolver 2',
				type: 'editable-type',
				config: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 'resolver-n8n',
				name: 'N8n Resolver',
				type: 'n8n-internal-type',
				config: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];

		const mockResolverTypes = [
			{
				name: 'editable-type',
				displayName: 'Editable Resolver',
				options: [{ name: 'url', type: 'string', displayName: 'URL', default: '' }],
			},
			{
				name: 'n8n-internal-type',
				displayName: 'N8N Resolver',
				options: [],
			},
		];

		beforeEach(() => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);
			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockResolverTypes);
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope('credentialResolver:list');
			rbacStore.addGlobalScope('credentialResolver:create');
			rbacStore.addGlobalScope('credentialResolver:update');
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

			// Should have 3 resolvers
			expect(dropdownItems).toHaveLength(3);
			expect(dropdownItems[0]).toHaveTextContent('Test Resolver 1');
			expect(dropdownItems[1]).toHaveTextContent('Test Resolver 2');
			expect(dropdownItems[2]).toHaveTextContent('N8n Resolver');
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

		it('should show "Edit" button when an editable resolver is selected', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-1' });

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(getByTestId('workflow-settings-credential-resolver-edit')).toBeInTheDocument();
			});
		});

		it('should not show "Edit" button when a non-editable resolver is selected', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-n8n' });

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolverTypes).toHaveBeenCalled();
			});

			await waitFor(() => {
				expect(queryByTestId('workflow-settings-credential-resolver-edit')).not.toBeInTheDocument();
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

		it('should save with empty credentialResolverId when resolver is cleared', async () => {
			// Element Plus clearable sets the model value to '' when the clear icon is clicked.
			// The clear icon requires CSS hover state which jsdom cannot simulate,
			// so we verify the save behavior when the value is already empty.
			workflowDocumentStore.setSettings({ credentialResolverId: '' });

			const { getByRole } = createComponent({ pinia });
			// flushPromises drains the full microtask queue, ensuring onMounted's
			// Promise.all (loadCredentialResolvers, loadWorkflows, etc.) fully resolves
			// and workflowSettings.value is initialized before we click Save.
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			const callArgs = workflowsStore.updateWorkflow.mock.calls[0];
			expect(callArgs[0]).toBe('1');
			expect(callArgs[1].settings?.credentialResolverId).toBe('');
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

	describe('Credential Resolver RBAC', () => {
		const mockResolvers = [
			{
				id: 'resolver-1',
				name: 'Test Resolver 1',
				type: 'editable-type',
				config: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];

		const mockResolverTypes = [
			{
				name: 'editable-type',
				displayName: 'Editable Resolver',
				options: [{ name: 'url', type: 'string', displayName: 'URL', default: '' }],
			},
		];

		beforeEach(() => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);
			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockResolverTypes);
		});

		it('should not show "Create new" button when user lacks credentialResolver:create scope', async () => {
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope('credentialResolver:list');
			rbacStore.addGlobalScope('credentialResolver:update');

			const { queryByTestId } = createComponent({ pinia });
			await flushPromises();

			expect(
				queryByTestId('workflow-settings-credential-resolver-create-new'),
			).not.toBeInTheDocument();
		});

		it('should show "Create new" button when user has credentialResolver:create scope', async () => {
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope('credentialResolver:list');
			rbacStore.addGlobalScope('credentialResolver:create');

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			expect(getByTestId('workflow-settings-credential-resolver-create-new')).toBeInTheDocument();
		});

		it('should not show "Edit" button when user lacks credentialResolver:update scope', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-1' });
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope('credentialResolver:list');
			rbacStore.addGlobalScope('credentialResolver:create');

			const { queryByTestId } = createComponent({ pinia });
			await flushPromises();

			expect(queryByTestId('workflow-settings-credential-resolver-edit')).not.toBeInTheDocument();
		});

		it('should show "Edit" button when user has credentialResolver:update scope and editable resolver is selected', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-1' });
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope('credentialResolver:list');
			rbacStore.addGlobalScope('credentialResolver:update');

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(getByTestId('workflow-settings-credential-resolver-edit')).toBeInTheDocument();
			});
		});

		it('should not fetch resolvers and should disable dropdown when user lacks credentialResolver:list scope', async () => {
			// No scopes added — user has no credentialResolver:list

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			expect(restApiClient.getCredentialResolvers).not.toHaveBeenCalled();
			expect(restApiClient.getCredentialResolverTypes).not.toHaveBeenCalled();

			const dropdownContainer = getByTestId('workflow-settings-credential-resolver');
			const input = dropdownContainer.querySelector('input');
			expect(input).toBeDisabled();
		});
	});

	describe('Redaction Policy', () => {
		it('should not render redaction policy when env feature flag is missing', async () => {
			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('workflow-settings-redaction-policy')).not.toBeInTheDocument();
		});

		it('should not render redaction policy when redaction module is inactive', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockImplementation(
				(name: string) => name !== 'redaction',
			);

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:updateRedactionSetting'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('workflow-settings-redaction-policy')).not.toBeInTheDocument();
		});

		it('should not render redaction policy when user lacks updateRedactionSetting scope', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			const { queryByTestId } = createComponent({ pinia });
			await nextTick();

			expect(queryByTestId('workflow-settings-redaction-policy')).not.toBeInTheDocument();
		});

		it('should render redaction policy when module is active and user has scope', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
			settingsStore.settings.envFeatureFlags.N8N_ENV_FEAT_REDACTION_POLICY = true;

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:updateRedactionSetting'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('workflow-settings-redaction-policy')).toBeVisible();
		});

		it('should render two redaction dropdowns with correct options', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:updateRedactionSetting'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			const productionItems = await getDropdownItems(
				getByTestId('workflow-settings-redact-production-select'),
			);
			expect(productionItems).toHaveLength(2);
			expect(productionItems[0]).toHaveTextContent('Default - Do not redact');
			expect(productionItems[1]).toHaveTextContent('Redact');

			const manualItems = await getDropdownItems(
				getByTestId('workflow-settings-redact-manual-select'),
			);
			expect(manualItems).toHaveLength(2);
			expect(manualItems[0]).toHaveTextContent('Default - Do not redact');
			expect(manualItems[1]).toHaveTextContent('Redact');
		});

		it('should save redaction policy as non-manual when only production is set to redact', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:updateRedactionSetting'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const productionItems = await getDropdownItems(
				getByTestId('workflow-settings-redact-production-select'),
			);
			await userEvent.click(productionItems[1]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'non-manual' }),
				}),
			);
		});

		it('should save redaction policy as all when both are set to redact', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:updateRedactionSetting'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { getByTestId, getByRole } = createComponent({ pinia });
			await nextTick();

			const productionItems = await getDropdownItems(
				getByTestId('workflow-settings-redact-production-select'),
			);
			await userEvent.click(productionItems[1]);

			const manualItems = await getDropdownItems(
				getByTestId('workflow-settings-redact-manual-select'),
			);
			await userEvent.click(manualItems[1]);

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		it('should disable production redaction select and force "Redact" when dynamic credentials are configured', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
			settingsStore.settings.envFeatureFlags.N8N_ENV_FEAT_REDACTION_POLICY = true;

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:updateRedactionSetting'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			workflowDocumentStore.setSettings({ credentialResolverId: 'some-resolver-id' });

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			await nextTick();

			// Verify the dropdown cannot be opened (disabled by workflowHasDynamicCredentials)
			const productionSelect = getByTestId('workflow-settings-redact-production-select');
			const dropdownItems = await getDropdownItems(productionSelect).catch(() => null);
			expect(dropdownItems).toBeNull();
		});
	});
});
