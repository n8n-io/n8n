import { reactive } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import type { MockInstance } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { SYSTEM_RESOLVER_ID, type FrontendSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflow } from '@/__tests__/mocks';
import { getDropdownItems, mockedStore, type MockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useRBACStore } from '@/app/stores/rbac.store';
import WorkflowSettingsVue from '@/app/components/WorkflowSettings/WorkflowSettings.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
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

// The modal is mounted globally, so it can be opened from views whose route has no
// `workflowId` param (e.g. the AI artifact view). The whole suite runs under that
// condition: the workflow id must always come from the document store, never the route.
vi.mock('vue-router', async () => ({
	useRouter: vi.fn(),
	useRoute: () =>
		reactive({
			params: {},
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

const getSecuritySettings = vi.fn();
vi.mock('@n8n/rest-api-client/api/security-settings', () => ({
	getSecuritySettings: (...args: unknown[]) => getSecuritySettings(...args),
	updateSecuritySettings: vi.fn(),
}));

const DEFAULT_SECURITY_SETTINGS = {
	personalSpacePublishing: false,
	personalSpaceSharing: false,
	publishedPersonalWorkflowsCount: 0,
	sharedPersonalWorkflowsCount: 0,
	sharedPersonalCredentialsCount: 0,
	managedByEnv: false,
};

let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let pinia: ReturnType<typeof createTestingPinia>;

let searchWorkflowsSpy: MockInstance<(typeof workflowsListStore)['searchWorkflows']>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

const workflowSettingsStubs = {
	Modal: {
		template:
			'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
	},
	// Stub ElSwitch to prevent spurious update:model-value emissions in jsdom.
	// userEvent.click simulates pointer movement that can trigger the switch
	// during mouse path traversal, toggling executionTimeout and breaking save.
	ElSwitch: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button type="button" :data-test-id="$attrs[\'data-test-id\']" :aria-checked="!!modelValue" role="switch" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	ParameterInputFull: {
		props: ['value', 'isReadOnly', 'path'],
		emits: ['update'],
		template: `
			<input
				:data-test-id="$attrs['data-test-id']"
				:value="value"
				:disabled="isReadOnly"
				@input="$emit('update', { name: path, value: $event.target.value })"
			/>
		`,
	},
};

const createComponent = createComponentRenderer(WorkflowSettingsVue, {
	global: {
		stubs: workflowSettingsStubs,
	},
});

const createComponentWithCustomTelemetryTagsStub = createComponentRenderer(WorkflowSettingsVue, {
	global: {
		stubs: {
			...workflowSettingsStubs,
			WorkflowCustomTelemetryTags: {
				props: ['modelValue', 'isReadOnly', 'saveTags'],
				emits: ['update:modelValue', 'validity-change'],
				methods: {
					async saveCustomTelemetryTags() {
						const tags = [{ key: 'env', value: 'production' }];
						try {
							await this.saveTags(tags);
						} catch {
							return;
						}
						this.$emit('update:modelValue', tags);
					},
				},
				template: `
					<div data-test-id="workflow-settings-custom-telemetry-tags">
						<button
							type="button"
							data-test-id="workflow-settings-custom-telemetry-tags-update"
							@click="$emit('update:modelValue', [{ key: 'env', value: 'production' }])"
						/>
						<button
							type="button"
							data-test-id="workflow-settings-custom-telemetry-tags-save-immediate"
							@click="saveCustomTelemetryTags"
						/>
						<button
							type="button"
							data-test-id="workflow-settings-custom-telemetry-tags-invalid"
							@click="$emit('validity-change', true)"
						/>
					</div>
				`,
			},
		},
	},
});

describe('WorkflowSettingsVue', () => {
	beforeEach(async () => {
		getSecuritySettings.mockResolvedValue({
			...DEFAULT_SECURITY_SETTINGS,
			redactionEnforcement: { floor: 'off' },
		});
		pinia = createTestingPinia({ stubActions: false });
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		settingsStore = mockedStore(useSettingsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		projectsStore = mockedStore(useProjectsStore);

		// Mock specific store actions that tests assert on
		workflowsStore.updateWorkflow = vi.fn();
		workflowsListStore.fetchWorkflow = vi.fn();
		// Component calls this on mount; avoid a real XHR with stubActions: false.
		settingsStore.getTimezones = vi.fn().mockResolvedValue({});

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
		workflowsStore.setWorkflowId('1');
		workflowDocumentStore.setName('Test Workflow');
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
		await flushPromises();
		expect(getByTestId('workflow-settings-dialog')).toBeVisible();
	});

	it('should not render workflow caller policy when sharing is not enabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = false;
		const { getByTestId } = createComponent({ pinia });

		await flushPromises();

		expect(
			within(getByTestId('workflow-settings-dialog')).queryByTestId('workflow-caller-policy'),
		).not.toBeInTheDocument();
	});

	it('should render workflow caller policy when sharing is enabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const { getByTestId } = createComponent({ pinia });

		await flushPromises();

		expect(getByTestId('workflow-caller-policy')).toBeVisible();
	});

	describe('Custom span attributes', () => {
		beforeEach(() => {
			settingsStore.settings.activeModules = ['dynamic-credentials', 'otel'];
			settingsStore.settings.enterprise.otelCustomSpanAttributes = true;
			settingsStore.moduleSettings = {
				otel: {
					enabled: true,
				},
			};
		});

		it('should show custom span attribute settings when OTel custom span attributes are enabled', async () => {
			const { getByTestId } = createComponentWithCustomTelemetryTagsStub({ pinia });

			await flushPromises();

			expect(getByTestId('workflow-settings-custom-telemetry-tags')).toBeVisible();
		});

		it('should hide custom telemetry tag settings when OTel is disabled', async () => {
			settingsStore.moduleSettings = {
				otel: {
					enabled: false,
				},
			};
			const { queryByTestId } = createComponentWithCustomTelemetryTagsStub({ pinia });

			await flushPromises();

			expect(queryByTestId('workflow-settings-custom-telemetry-tags')).not.toBeInTheDocument();
		});

		it('should hide custom span attribute settings when OTel custom span attributes are not licensed', async () => {
			settingsStore.settings.enterprise.otelCustomSpanAttributes = false;
			const { queryByTestId } = createComponentWithCustomTelemetryTagsStub({ pinia });

			await flushPromises();

			expect(queryByTestId('workflow-settings-custom-telemetry-tags')).not.toBeInTheDocument();
		});

		it('should save workflow settings with custom span attributes emitted by the child', async () => {
			const { getByTestId, getByRole } = createComponentWithCustomTelemetryTagsStub({ pinia });
			await flushPromises();

			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-update'));
			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					settings: expect.objectContaining({
						customTelemetryTags: [{ key: 'env', value: 'production' }],
					}),
				}),
			);
		});

		it('should persist custom span attributes immediately with a partial settings payload', async () => {
			workflowDocumentStore.setChecksum('test-checksum');
			const { getByTestId } = createComponentWithCustomTelemetryTagsStub({ pinia });
			await flushPromises();

			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save-immediate'));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith('1', {
				settings: {
					customTelemetryTags: [{ key: 'env', value: 'production' }],
				},
				expectedChecksum: 'test-checksum',
			});
			expect(workflowDocumentStore.settings.customTelemetryTags).toEqual([
				{ key: 'env', value: 'production' },
			]);
		});

		it('should show an error when immediate custom span attribute persistence fails', async () => {
			const error = new Error('Save failed');
			workflowsStore.updateWorkflow.mockRejectedValue(error);
			const { getByTestId } = createComponentWithCustomTelemetryTagsStub({ pinia });
			await flushPromises();

			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-save-immediate'));

			await waitFor(() => {
				expect(toast.showError).toHaveBeenCalledWith(error, 'Problem saving settings');
			});
			expect(workflowDocumentStore.settings.customTelemetryTags).toBeUndefined();
		});

		it('should disable workflow settings save when custom span attributes are invalid', async () => {
			const { getByTestId, getByRole } = createComponentWithCustomTelemetryTagsStub({ pinia });
			await flushPromises();

			await userEvent.click(getByTestId('workflow-settings-custom-telemetry-tags-invalid'));

			expect(getByRole('button', { name: 'Save' })).toBeDisabled();
		});
	});

	it('should render list of workflows field when policy is set to workflowsFromAList', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
		const { getByTestId } = createComponent({ pinia });

		await flushPromises();
		const dropdownItems = await getDropdownItems(getByTestId('workflow-caller-policy'));
		await userEvent.click(dropdownItems[2]);

		expect(getByTestId('workflow-caller-policy-workflow-ids')).toBeVisible();
	});

	describe('Error Workflow', () => {
		it('should fetch all workflows and render them in the error workflows dropdown', async () => {
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Sharing] = true;
			const { getByTestId } = createComponent({ pinia });

			await flushPromises();
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
			await flushPromises();

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
			await flushPromises();

			// Open the error workflow dropdown
			const errorWorkflowRow = getByTestId('error-workflow');
			const combobox = within(errorWorkflowRow).getByRole('combobox');
			await userEvent.click(combobox);

			// Wait for dropdown to appear and select "No Workflow"
			await waitFor(async () => {
				const option = within(document.body as HTMLElement).getAllByRole('option');
				const noWorkflow = option.find((o) => o.textContent?.includes('No Workflow'));
				expect(noWorkflow).toBeTruthy();
				await userEvent.click(noWorkflow!);
			});
			await flushPromises();

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
			await flushPromises();

			// Open the error workflow dropdown
			const errorWorkflowRow = getByTestId('error-workflow');
			await userEvent.click(within(errorWorkflowRow).getByRole('combobox'));

			// Wait for dropdown and select the test workflow
			await waitFor(async () => {
				const options = within(document.body as HTMLElement).getAllByRole('option');
				const testWorkflow = options.find((o) => o.textContent?.includes('Test Workflow'));
				expect(testWorkflow).toBeTruthy();
				await userEvent.click(testWorkflow!);
			});
			await flushPromises();

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

		await flushPromises();

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

		await flushPromises();

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
			await flushPromises();

			const dropdownItems = await getDropdownItems(getByTestId(testId));

			expect(dropdownItems[0]).toHaveTextContent(optionText);
		},
	);

	it('should save time saved per execution correctly', async () => {
		workflowDocumentStore.setSettings({ timeSavedMode: 'fixed' });
		const { getByTestId, getByRole } = createComponent({ pinia });
		await flushPromises();
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
		await flushPromises();
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
		await flushPromises();
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
		await flushPromises();
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
			await flushPromises();

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
			await flushPromises();

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
			await flushPromises();

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
			await flushPromises();

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
			await flushPromises();

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
			await flushPromises();

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-execution-order'),
			);

			expect(dropdownItems[1]).toHaveTextContent('v1');
		});

		it('should disable execution order dropdown when environment is read-only', async () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

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
			await flushPromises();

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
				id: SYSTEM_RESOLVER_ID,
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
			await flushPromises();

			expect(getByTestId('workflow-settings-credential-resolver')).toBeVisible();
		});

		it('should load credential resolvers on mount', async () => {
			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

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
			await flushPromises();

			await waitFor(() => {
				expect(getByTestId('workflow-settings-credential-resolver-create-new')).toBeInTheDocument();
			});
		});

		it('should not show "Edit" button when the default n8n system resolver is selected', async () => {
			const { queryByTestId } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(queryByTestId('workflow-settings-credential-resolver-edit')).not.toBeInTheDocument();
			});
		});

		it('should show "Edit" button when an editable resolver is selected', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-1' });

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(getByTestId('workflow-settings-credential-resolver-edit')).toBeInTheDocument();
			});
		});

		it('should not show "Edit" button when a non-editable resolver is selected', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: SYSTEM_RESOLVER_ID });

			const { queryByTestId } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolverTypes).toHaveBeenCalled();
			});

			await waitFor(() => {
				expect(queryByTestId('workflow-settings-credential-resolver-edit')).not.toBeInTheDocument();
			});
		});

		it('should select a resolver from dropdown', async () => {
			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			const dropdownItems = await getDropdownItems(
				getByTestId('workflow-settings-credential-resolver'),
			);

			expect(dropdownItems).toHaveLength(3);
			expect(dropdownItems[0]).toHaveTextContent('Test Resolver 1');
			expect(dropdownItems[1]).toHaveTextContent('Test Resolver 2');
			expect(dropdownItems[2]).toHaveTextContent('N8n Resolver');

			await userEvent.click(dropdownItems[0]);
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					settings: expect.objectContaining({ credentialResolverId: 'resolver-1' }),
				}),
			);
		});

		it('should save workflow with selected resolver', async () => {
			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			// Open the credential resolver dropdown
			const resolverContainer = getByTestId('workflow-settings-credential-resolver');
			await userEvent.click(within(resolverContainer).getByRole('combobox'));

			// Wait for dropdown and select "Test Resolver 2"
			await waitFor(async () => {
				const options = within(document.body as HTMLElement).getAllByRole('option');
				const resolver = options.find((o) => o.textContent?.includes('Test Resolver 2'));
				expect(resolver).toBeTruthy();
				await userEvent.click(resolver!);
			});
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			const callArgs = workflowsStore.updateWorkflow.mock.calls[0];
			expect(callArgs[0]).toBe('1');
			expect(callArgs[1].settings?.credentialResolverId).toBe('resolver-2');
		});

		it('should save with empty credentialResolverId when resolver is cleared', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-1' });

			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			const dropdown = getByTestId('workflow-settings-credential-resolver');
			const input = dropdown.querySelector('input') as HTMLInputElement;

			// Wait for the select to display the selected resolver
			await waitFor(() => {
				expect(input?.value).toBe('Test Resolver 1');
			});

			// Hover over the select trigger to reveal the clear icon.
			// Element Plus toggles the clear icon via a JS mouseenter handler on
			// .select-trigger (not CSS :hover), and Vue re-renders asynchronously.
			const selectTrigger = dropdown.querySelector('.select-trigger') as HTMLElement;
			const arrowIcon = dropdown.querySelector('.el-icon');
			selectTrigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

			// Wait for Vue to swap the arrow icon for the clear icon (different VNode keys)
			await waitFor(() => {
				expect(dropdown.querySelector('.el-icon')).not.toBe(arrowIcon);
			});

			// Click the clear icon
			const clearIcon = dropdown.querySelector('.el-icon') as HTMLElement;
			await fireEvent.click(clearIcon);
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					settings: expect.objectContaining({ credentialResolverId: '' }),
				}),
			);
		});

		it('should save with empty credentialResolverId when switching back to the system resolver', async () => {
			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-1' });

			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			// Open the dropdown and pick the n8n system resolver
			const resolverContainer = getByTestId('workflow-settings-credential-resolver');
			await userEvent.click(within(resolverContainer).getByRole('combobox'));

			await waitFor(async () => {
				const options = within(document.body as HTMLElement).getAllByRole('option');
				const systemResolver = options.find((o) => o.textContent?.includes('N8n Resolver'));
				expect(systemResolver).toBeTruthy();
				await userEvent.click(systemResolver!);
			});
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			// `undefined` would be stripped during serialization and the merge on the backend
			// would keep the old id, so the clear must be sent as an explicit empty string.
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					settings: expect.objectContaining({ credentialResolverId: '' }),
				}),
			);
		});

		it('should disable credential resolver dropdown when environment is read-only', async () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

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
			await flushPromises();

			const dropdownContainer = getByTestId('workflow-settings-credential-resolver');
			const input = dropdownContainer.querySelector('input');
			expect(input).toBeDisabled();
		});

		it('should clear stale credentialResolverId when resolver no longer exists', async () => {
			workflowDocumentStore.setSettings({
				credentialResolverId: 'deleted-resolver-id',
			});

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			// The stale ID is cleared and the n8n system resolver is selected as the default.
			const dropdown = getByTestId('workflow-settings-credential-resolver');
			const input = dropdown.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('N8n Resolver');
		});

		it('should default to the n8n system resolver when no resolver is selected', async () => {
			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				expect(restApiClient.getCredentialResolvers).toHaveBeenCalled();
			});

			const dropdown = getByTestId('workflow-settings-credential-resolver');
			const input = dropdown.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('N8n Resolver');
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
		it('should show redaction policy section when licensed but user lacks redaction scopes', async () => {
			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			expect(getByTestId('workflow-settings-redaction-policy')).toBeInTheDocument();
		});

		it('should not render redaction policy when redaction module is inactive', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockImplementation(
				(name: string) => name !== 'redaction',
			);

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { queryByTestId } = createComponent({ pinia });
			await flushPromises();

			expect(queryByTestId('workflow-settings-redaction-policy')).not.toBeInTheDocument();
		});

		it('should disable redaction dropdowns when user lacks enableRedaction scope', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			const productionCombobox = within(
				getByTestId('workflow-settings-redact-production-select'),
			).getByRole('combobox');
			const manualCombobox = within(
				getByTestId('workflow-settings-redact-manual-select'),
			).getByRole('combobox');
			expect(productionCombobox).toBeDisabled();
			expect(manualCombobox).toBeDisabled();
		});

		it('should render redaction policy when module is active and user has scope', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			expect(getByTestId('workflow-settings-redaction-policy')).toBeVisible();
		});

		it('should render two redaction dropdowns with correct options', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = true;
			projectsStore.personalProject = mock<Project>({
				scopes: ['workflow:enableRedaction', 'workflow:disableRedaction'],
			});

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);
			// Seed with production=redact so the manual select is editable (the new
			// workflow-level invariant disables manual when production is default).
			workflowDocumentStore.setSettings({ redactionPolicy: 'non-manual' });

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

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
			settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = true;
			projectsStore.personalProject = mock<Project>({
				scopes: ['workflow:enableRedaction', 'workflow:disableRedaction'],
			});

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			// Open the production redaction dropdown
			const productionSelect = getByTestId('workflow-settings-redact-production-select');
			await userEvent.click(within(productionSelect).getByRole('combobox'));

			// Select "Redact"
			await waitFor(async () => {
				const options = within(document.body as HTMLElement).getAllByRole('option');
				const redactOption = options.find((o) => o.textContent?.trim() === 'Redact');
				expect(redactOption).toBeTruthy();
				await userEvent.click(redactOption!);
			});
			await flushPromises();

			toast.showError.mockClear();
			await userEvent.click(getByRole('button', { name: 'Save' }));
			expect(toast.showError).not.toHaveBeenCalled();

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'non-manual' }),
				}),
			);
		});

		it('should save redaction policy as all when both are set to redact', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = true;
			projectsStore.personalProject = mock<Project>({
				scopes: ['workflow:enableRedaction', 'workflow:disableRedaction'],
			});

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			// Open the production redaction dropdown and select "Redact"
			const productionSelect = getByTestId('workflow-settings-redact-production-select');
			await userEvent.click(within(productionSelect).getByRole('combobox'));
			await waitFor(async () => {
				const options = within(document.body as HTMLElement).getAllByRole('option');
				const redactOption = options.find((o) => o.textContent?.trim() === 'Redact');
				expect(redactOption).toBeTruthy();
				await userEvent.click(redactOption!);
			});
			await flushPromises();

			// Open the manual redaction dropdown and select "Redact"
			const manualSelect = getByTestId('workflow-settings-redact-manual-select');
			await userEvent.click(within(manualSelect).getByRole('combobox'));
			await waitFor(async () => {
				const options = within(document.body as HTMLElement).getAllByRole('option');
				const redactOption = options.find(
					(o) => o.textContent?.trim() === 'Redact' && !o.classList.contains('selected'),
				);
				expect(redactOption).toBeTruthy();
				await userEvent.click(redactOption!);
			});
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		it('should enable production dropdown when policy is "none" and user has only enableRedaction scope', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

			settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = true;
			projectsStore.personalProject = mock<Project>({ scopes: ['workflow:enableRedaction'] });

			const workflowEnableOnly = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowEnableOnly };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowEnableOnly);

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			// Current policy is 'none' (default), so enabling = requires enableRedaction → unlocked
			const productionCombobox = within(
				getByTestId('workflow-settings-redact-production-select'),
			).getByRole('combobox');
			expect(productionCombobox).not.toBeDisabled();

			// Manual select stays disabled until production is set to redact (workflow-level invariant).
			const manualCombobox = within(
				getByTestId('workflow-settings-redact-manual-select'),
			).getByRole('combobox');
			expect(manualCombobox).toBeDisabled();
		});

		it('should disable dropdowns when policy is active and user has only enableRedaction scope', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = true;

			// Current policy is 'all' so both dropdowns show 'redact' state.
			// Switching to 'default' = disabling → requires disableRedaction (not granted).
			workflowDocumentStore.setSettings({ redactionPolicy: 'all' });

			const workflowEnableOnly = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowEnableOnly };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowEnableOnly);

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			await waitFor(() => {
				const productionCombobox = within(
					getByTestId('workflow-settings-redact-production-select'),
				).getByRole('combobox');
				expect(productionCombobox).toBeDisabled();
			});

			const manualCombobox = within(
				getByTestId('workflow-settings-redact-manual-select'),
			).getByRole('combobox');
			expect(manualCombobox).toBeDisabled();
		});

		it('should disable production redaction select and force "Redact" when dynamic credentials are configured', async () => {
			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([
				{
					id: 'resolver-1',
					name: 'Test Resolver 1',
					type: 'editable-type',
					config: '{}',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);
			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue([
				{ name: 'editable-type', displayName: 'Editable', options: [] },
			]);
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope('credentialResolver:list');

			const workflowWithRedactionScope = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				scopes: ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction'],
			});
			workflowsListStore.workflowsById = { '1': workflowWithRedactionScope };
			workflowsListStore.getWorkflowById.mockImplementation(() => workflowWithRedactionScope);

			workflowDocumentStore.setSettings({ credentialResolverId: 'resolver-1' });

			const { getByTestId } = createComponent({ pinia });
			await flushPromises();

			// Verify the credential resolver dropdown shows the selected resolver
			await waitFor(() => {
				const resolverDropdown = getByTestId('workflow-settings-credential-resolver');
				const resolverInput = resolverDropdown.querySelector('input') as HTMLInputElement;
				expect(resolverInput.value).toBe('Test Resolver 1');
			});

			const productionSelect = getByTestId('workflow-settings-redact-production-select');
			const input = productionSelect.querySelector('input');
			expect(input).toBeDisabled();
		});

		describe('manual requires production', () => {
			const setUpManualRequiresProduction = (params: {
				redactionPolicy: 'none' | 'non-manual' | 'manual-only' | 'all';
			}) => {
				vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
				settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = true;
				projectsStore.personalProject = mock<Project>({
					scopes: ['workflow:enableRedaction', 'workflow:disableRedaction'],
				});
				const workflow = createTestWorkflow({
					id: '1',
					name: 'Test Workflow',
					active: true,
					scopes: ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction'],
				});
				workflowsListStore.workflowsById = { '1': workflow };
				workflowsListStore.getWorkflowById.mockImplementation(() => workflow);
				workflowDocumentStore.setSettings({ redactionPolicy: params.redactionPolicy });
			};

			it('disables manual select when production is not redacted', async () => {
				setUpManualRequiresProduction({ redactionPolicy: 'none' });

				const { getByTestId } = createComponent({ pinia });
				await flushPromises();

				const manualCombobox = within(
					getByTestId('workflow-settings-redact-manual-select'),
				).getByRole('combobox');
				expect(manualCombobox).toBeDisabled();
			});

			it('keeps manual select enabled when production is set to redact', async () => {
				setUpManualRequiresProduction({ redactionPolicy: 'non-manual' });

				const { getByTestId } = createComponent({ pinia });
				await flushPromises();

				const manualCombobox = within(
					getByTestId('workflow-settings-redact-manual-select'),
				).getByRole('combobox');
				expect(manualCombobox).not.toBeDisabled();
			});

			it('coerces manual back to default when production drops to default and persists redactionPolicy: none on save', async () => {
				setUpManualRequiresProduction({ redactionPolicy: 'all' });

				const { getByTestId, getByRole } = createComponent({ pinia });
				await flushPromises();

				// Sanity check: both selects start as "Redact"
				const manualInput = getByTestId('workflow-settings-redact-manual-select').querySelector(
					'input',
				) as HTMLInputElement;
				expect(manualInput.value).toBe('Redact');

				// Switch production to "Default - Do not redact"
				const productionSelect = getByTestId('workflow-settings-redact-production-select');
				await userEvent.click(within(productionSelect).getByRole('combobox'));
				await waitFor(async () => {
					const options = within(document.body as HTMLElement).getAllByRole('option');
					const defaultOption = options.find(
						(o) => o.textContent?.trim() === 'Default - Do not redact',
					);
					expect(defaultOption).toBeTruthy();
					await userEvent.click(defaultOption!);
				});
				await flushPromises();

				// Manual select should have visibly reset to "Default - Do not redact"
				expect(manualInput.value).toBe('Default - Do not redact');

				toast.showError.mockClear();
				await userEvent.click(getByRole('button', { name: 'Save' }));
				expect(toast.showError).not.toHaveBeenCalled();

				expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'none' }),
					}),
				);
			});

			it('disables manual select independently of license, permission, and enforcement gates', async () => {
				setUpManualRequiresProduction({ redactionPolicy: 'none' });

				const { getByTestId, queryByTestId } = createComponent({ pinia });
				await flushPromises();

				// No other lock is in play.
				expect(queryByTestId('workflow-settings-redaction-floor-lock')).not.toBeInTheDocument();

				const manualCombobox = within(
					getByTestId('workflow-settings-redact-manual-select'),
				).getByRole('combobox');
				expect(manualCombobox).toBeDisabled();
			});
		});

		describe('instance floor', () => {
			const setUpFloor = (params: {
				floor: 'off' | 'production' | 'all';
				hasUpdatePermission?: boolean;
				redactionPolicy?: 'none' | 'non-manual' | 'manual-only' | 'all';
			}) => {
				vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
				settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = true;
				getSecuritySettings.mockResolvedValue({
					...DEFAULT_SECURITY_SETTINGS,
					redactionEnforcement: { floor: params.floor },
				});

				const hasPermission = params.hasUpdatePermission ?? true;
				const scopes = (
					hasPermission
						? ['workflow:update', 'workflow:enableRedaction', 'workflow:disableRedaction']
						: ['workflow:update']
				) as Array<'workflow:update' | 'workflow:enableRedaction' | 'workflow:disableRedaction'>;
				projectsStore.personalProject = mock<Project>({
					scopes: hasPermission ? ['workflow:enableRedaction', 'workflow:disableRedaction'] : [],
				});
				const workflow = createTestWorkflow({
					id: '1',
					name: 'Test Workflow',
					active: true,
					scopes,
				});
				workflowsListStore.workflowsById = { '1': workflow };
				workflowsListStore.getWorkflowById.mockImplementation(() => workflow);

				if (params.redactionPolicy) {
					workflowDocumentStore.setSettings({ redactionPolicy: params.redactionPolicy });
				}
			};

			it('locks production select with floor copy under floor "production"; manual stays editable', async () => {
				setUpFloor({ floor: 'production', redactionPolicy: 'none' });

				const { getByTestId, getAllByTestId } = createComponent({ pinia });
				await flushPromises();

				const productionInput = within(
					getByTestId('workflow-settings-redact-production-select'),
				).getByRole('combobox');
				expect(productionInput).toBeDisabled();
				expect(
					getByTestId('workflow-settings-redact-production-select').querySelector('input')?.value,
				).toBe('Redact');

				const floorIcons = getAllByTestId('workflow-settings-redaction-floor-lock');
				expect(floorIcons).toHaveLength(1);

				// Production was coerced to 'redact', so the IAM-697 rule no longer blocks the manual select.
				const manualInput = within(getByTestId('workflow-settings-redact-manual-select')).getByRole(
					'combobox',
				);
				expect(manualInput).not.toBeDisabled();
			});

			it('locks both selects with floor copy under floor "all"', async () => {
				setUpFloor({ floor: 'all', redactionPolicy: 'none' });

				const { getByTestId, getAllByTestId } = createComponent({ pinia });
				await flushPromises();

				const productionInput = within(
					getByTestId('workflow-settings-redact-production-select'),
				).getByRole('combobox');
				const manualInput = within(getByTestId('workflow-settings-redact-manual-select')).getByRole(
					'combobox',
				);
				expect(productionInput).toBeDisabled();
				expect(manualInput).toBeDisabled();

				expect(
					getByTestId('workflow-settings-redact-production-select').querySelector('input')?.value,
				).toBe('Redact');
				expect(
					getByTestId('workflow-settings-redact-manual-select').querySelector('input')?.value,
				).toBe('Redact');

				expect(getAllByTestId('workflow-settings-redaction-floor-lock')).toHaveLength(2);
			});

			it('leaves both selects editable under floor "off"', async () => {
				setUpFloor({ floor: 'off', redactionPolicy: 'non-manual' });

				const { getByTestId, queryByTestId } = createComponent({ pinia });
				await flushPromises();

				const productionInput = within(
					getByTestId('workflow-settings-redact-production-select'),
				).getByRole('combobox');
				const manualInput = within(getByTestId('workflow-settings-redact-manual-select')).getByRole(
					'combobox',
				);
				expect(productionInput).not.toBeDisabled();
				expect(manualInput).not.toBeDisabled();
				expect(queryByTestId('workflow-settings-redaction-floor-lock')).not.toBeInTheDocument();
				expect(getSecuritySettings).toHaveBeenCalled();
			});

			it('does not fetch the instance floor when DataRedaction is not licensed', async () => {
				setUpFloor({ floor: 'all', redactionPolicy: 'non-manual' });
				settingsStore.settings.enterprise[EnterpriseEditionFeature.DataRedaction] = false;

				createComponent({ pinia });
				await flushPromises();

				// Gating the fetch on the license avoids a guaranteed-403 request for
				// non-enterprise instances.
				expect(getSecuritySettings).not.toHaveBeenCalled();
			});

			it('keeps manual select enabled under floor "production" (production coerced to redact)', async () => {
				setUpFloor({ floor: 'production', redactionPolicy: 'none' });

				const { getByTestId, queryByText } = createComponent({ pinia });
				await flushPromises();

				const manualInput = within(getByTestId('workflow-settings-redact-manual-select')).getByRole(
					'combobox',
				);
				expect(manualInput).not.toBeDisabled();
				// IAM-697 hint must not be shown — production is forced to redact.
				expect(
					queryByText(
						'Manual execution data can only be redacted when production execution data is also redacted.',
					),
				).not.toBeInTheDocument();
			});

			it('shows the floor lock on manual (not the IAM-697 hint) when floor "all" and policy "none"', async () => {
				setUpFloor({ floor: 'all', redactionPolicy: 'none' });

				const { getAllByTestId, queryByText } = createComponent({ pinia });
				await flushPromises();

				expect(getAllByTestId('workflow-settings-redaction-floor-lock')).toHaveLength(2);
				expect(
					queryByText(
						'Manual execution data can only be redacted when production execution data is also redacted.',
					),
				).not.toBeInTheDocument();
			});

			it('does not persist the floor-coerced production value when the user made no redaction change under floor "production"', async () => {
				setUpFloor({ floor: 'production', redactionPolicy: 'none' });

				const { getByRole } = createComponent({ pinia });
				await flushPromises();

				toast.showError.mockClear();
				await userEvent.click(getByRole('button', { name: 'Save' }));
				expect(toast.showError).not.toHaveBeenCalled();

				// The floor coerces the production select to "Redact" for display only — the workflow's
				// own stored policy must be preserved, not overwritten with the floor's value. (ENT-35)
				expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'none' }),
					}),
				);
			});

			it('does not persist the floor-coerced values when the user made no redaction change under floor "all"', async () => {
				setUpFloor({ floor: 'all', redactionPolicy: 'none' });

				const { getByRole } = createComponent({ pinia });
				await flushPromises();

				toast.showError.mockClear();
				await userEvent.click(getByRole('button', { name: 'Save' }));
				expect(toast.showError).not.toHaveBeenCalled();

				expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'none' }),
					}),
				);
			});

			it('persists "all" when the user genuinely enables manual redaction under floor "production"', async () => {
				setUpFloor({ floor: 'production', redactionPolicy: 'none' });

				const { getByTestId, getByRole } = createComponent({ pinia });
				await flushPromises();

				// Production is floor-locked to "Redact"; manual stays editable. Turning manual on
				// implies production (IAM-697), so the genuine, intended save is "all".
				const manualSelect = getByTestId('workflow-settings-redact-manual-select');
				await userEvent.click(within(manualSelect).getByRole('combobox'));
				await waitFor(async () => {
					const options = within(document.body as HTMLElement).getAllByRole('option');
					const redactOption = options.find((o) => o.textContent?.trim() === 'Redact');
					expect(redactOption).toBeTruthy();
					await userEvent.click(redactOption!);
				});
				await flushPromises();

				toast.showError.mockClear();
				await userEvent.click(getByRole('button', { name: 'Save' }));
				expect(toast.showError).not.toHaveBeenCalled();

				expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'all' }),
					}),
				);
			});

			it('preserves an existing stricter stored policy on save under floor "production"', async () => {
				setUpFloor({ floor: 'production', redactionPolicy: 'non-manual' });

				const { getByRole } = createComponent({ pinia });
				await flushPromises();

				toast.showError.mockClear();
				await userEvent.click(getByRole('button', { name: 'Save' }));
				expect(toast.showError).not.toHaveBeenCalled();

				expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'non-manual' }),
					}),
				);
			});

			it('fails open when getSecuritySettings rejects (no floor lock, selects editable)', async () => {
				setUpFloor({ floor: 'production', redactionPolicy: 'non-manual' });
				// Override the resolved mock with a rejection — the component must swallow the error
				// and leave instanceRedactionFloor at its default 'off'.
				getSecuritySettings.mockRejectedValueOnce(new Error('Network error'));

				const { getByTestId, queryByTestId } = createComponent({ pinia });
				await flushPromises();

				const productionInput = within(
					getByTestId('workflow-settings-redact-production-select'),
				).getByRole('combobox');
				const manualInput = within(getByTestId('workflow-settings-redact-manual-select')).getByRole(
					'combobox',
				);
				expect(productionInput).not.toBeDisabled();
				expect(manualInput).not.toBeDisabled();
				expect(queryByTestId('workflow-settings-redaction-floor-lock')).not.toBeInTheDocument();
			});

			it('keeps the permission lock active under floor "off" (no floor lock applies)', async () => {
				setUpFloor({
					floor: 'off',
					hasUpdatePermission: false,
					redactionPolicy: 'all',
				});

				const { getByTestId, queryByTestId } = createComponent({ pinia });
				await flushPromises();

				const productionInput = within(
					getByTestId('workflow-settings-redact-production-select'),
				).getByRole('combobox');
				const manualInput = within(getByTestId('workflow-settings-redact-manual-select')).getByRole(
					'combobox',
				);
				expect(productionInput).toBeDisabled();
				expect(manualInput).toBeDisabled();

				// No floor-lock indicator under floor "off" (the lock comes from missing permission).
				expect(queryByTestId('workflow-settings-redaction-floor-lock')).not.toBeInTheDocument();
			});
		});
	});
});
