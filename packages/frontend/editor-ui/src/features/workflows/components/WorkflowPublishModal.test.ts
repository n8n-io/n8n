import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import WorkflowPublishModal from '@/features/workflows/components/WorkflowPublishModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import {
	WEBHOOK_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	type INodeTypeDescription,
} from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';

const mockPublishWorkflow = vi.fn();
const mockShowMessage = vi.fn();
const mockTelemetryTrack = vi.fn();

vi.mock('@/app/composables/useWorkflowActivate', () => ({
	useWorkflowActivate: () => ({
		publishWorkflow: mockPublishWorkflow,
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
	}),
}));

vi.mock('@/app/plugins/telemetry', () => ({
	telemetry: {
		get track() {
			return mockTelemetryTrack;
		},
	},
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {},
		},
	},
	[STORES.UI]: {
		modalStateById: {
			[WORKFLOW_PUBLISH_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [WORKFLOW_PUBLISH_MODAL_KEY],
	},
};

const renderComponent = createComponentRenderer(WorkflowPublishModal, {
	pinia: createTestingPinia({ initialState, stubActions: false }),
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
			WorkflowVersionForm: {
				template: `
					<div>
						<input data-test-id="workflow-publish-version-name-input" @input="$emit('update:versionName', $event.target.value)" />
					</div>
				`,
				props: ['versionName', 'description', 'disabled'],
			},
		},
	},
});

const WEBHOOK_NODE_TYPE_DESCRIPTION: INodeTypeDescription = {
	displayName: 'Webhook',
	name: WEBHOOK_NODE_TYPE,
	group: ['trigger'],
	version: 1,
	description: 'Starts the workflow when a webhook is called',
	defaults: { name: 'Webhook' },
	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
	webhooks: [{ name: 'default', httpMethod: 'GET', path: '' }],
};

const SCHEDULE_TRIGGER_NODE_TYPE_DESCRIPTION: INodeTypeDescription = {
	displayName: 'Schedule Trigger',
	name: SCHEDULE_TRIGGER_NODE_TYPE,
	group: ['trigger'],
	version: 1,
	description: 'Triggers the workflow on a schedule',
	defaults: { name: 'Schedule Trigger' },
	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
};

describe('WorkflowPublishModal', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		// Register the trigger node types so workflowTriggerNodes computed recognises triggers
		const nodeTypesStore = useNodeTypesStore();
		nodeTypesStore.setNodeTypes([
			WEBHOOK_NODE_TYPE_DESCRIPTION,
			SCHEDULE_TRIGGER_NODE_TYPE_DESCRIPTION,
		]);

		workflowsStore.setWorkflowId('workflow-1');

		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('workflow-1'));
		workflowDocumentStore.setActiveState({
			activeVersionId: 'old-version',
			activeVersion: {
				versionId: 'old-version',
				authors: 'Test Author',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				workflowPublishHistory: [],
				name: 'Published Version',
				description: null,
			},
		});

		// Set versionId different from activeVersion.versionId so wfHasAnyChanges is true
		workflowDocumentStore.setVersionData({
			versionId: 'new-version',
			name: null,
			description: null,
		});

		// Add a trigger node to the document store so containsTrigger is true
		workflowDocumentStore.setNodes([
			{
				id: 'trigger-1',
				name: 'Webhook Trigger',
				type: WEBHOOK_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				disabled: false,
			},
		]);

		mockPublishWorkflow.mockReset().mockResolvedValue({
			success: true,
			errorHandled: false,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('handlePublish with conflicting webhooks', () => {
		it('should not show warning when publish fails with a conflict but handled conflict error', async () => {
			mockPublishWorkflow.mockReset().mockResolvedValue({
				success: false,
				errorHandled: true,
			});
			workflowsListStore.fetchWorkflow.mockResolvedValue({
				id: 'conflicting-workflow-123',
				name: 'Conflicting Workflow Name',
				active: true,
				isArchived: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				nodes: [],
				connections: {},
				versionId: 'version-123',
				activeVersionId: 'version-123',
			});

			const { getByTestId } = renderComponent();

			const versionInput = getByTestId('workflow-publish-version-name-input');
			await userEvent.type(versionInput, 'v1.0.0');

			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(mockPublishWorkflow).toHaveBeenCalled();
				expect(mockShowMessage).not.toHaveBeenCalled();
				expect(mockTelemetryTrack).not.toHaveBeenCalled();
			});
		});

		it('should not show duplicate warning when publish fails with handled error', async () => {
			mockPublishWorkflow.mockReset().mockResolvedValue({
				success: false,
				errorHandled: true,
			});

			const { getByTestId } = renderComponent();

			const versionInput = getByTestId('workflow-publish-version-name-input');
			await userEvent.type(versionInput, 'v1.0.0');

			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(mockPublishWorkflow).toHaveBeenCalled();
				expect(mockShowMessage).not.toHaveBeenCalled();
				expect(mockTelemetryTrack).not.toHaveBeenCalled();
			});
		});
	});

	describe('handlePublish without conflicts', () => {
		it('should proceed to publish when there are no conflicting webhooks', async () => {
			mockPublishWorkflow.mockReset().mockResolvedValue({
				success: true,
				errorHandled: false,
			});
			const { getByTestId } = renderComponent();

			const versionInput = getByTestId('workflow-publish-version-name-input');
			await userEvent.type(versionInput, 'v1.0.0');

			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(mockPublishWorkflow).toHaveBeenCalled();
				expect(mockShowMessage).not.toHaveBeenCalled();
				expect(mockTelemetryTrack).toHaveBeenCalledWith('User published version from canvas', {
					workflow_id: 'workflow-1',
				});
			});
		});
	});

	describe('re-attempt (partial / failed publication)', () => {
		// Set versionId === activeVersion.versionId so wfHasAnyChanges is false
		beforeEach(() => {
			workflowDocumentStore.setVersionData({
				versionId: 'old-version',
				name: null,
				description: null,
			});
		});

		it.each(['partial', 'failed'] as const)(
			'enables the Publish button and shows reattempt callout when status is "%s" with no changes',
			async (status) => {
				workflowDocumentStore.setPublicationStatus({ status });

				const { getByTestId, queryByTestId } = renderComponent();

				// Publish button is enabled (onMounted sets versionName, so wait for reactivity)
				await waitFor(() => {
					expect(getByTestId('workflow-publish-button')).not.toBeDisabled();
				});

				// reattempt callout is shown
				expect(getByTestId('workflow-publish-callout-reattempt')).toBeInTheDocument();

				// noChanges callout is NOT shown
				expect(queryByTestId('workflow-publish-callout-no-changes')).not.toBeInTheDocument();
			},
		);

		it('still blocks re-attempt when containsTrigger is false', async () => {
			workflowDocumentStore.setPublicationStatus({ status: 'partial' });
			workflowDocumentStore.setNodes([]);

			const { getByTestId } = renderComponent();

			await waitFor(() => {
				expect(getByTestId('workflow-publish-button')).toBeDisabled();
			});
		});

		it('still blocks re-attempt when hasNodeIssues is true', async () => {
			workflowDocumentStore.setPublicationStatus({ status: 'failed' });
			// Inject a node with a blocking issue
			workflowDocumentStore.setNodes([
				{
					id: 'trigger-1',
					name: 'Webhook Trigger',
					type: WEBHOOK_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					disabled: false,
					issues: { parameters: { param: ['Required parameter is missing'] } },
				},
			]);

			const { getByTestId } = renderComponent();

			await waitFor(() => {
				expect(getByTestId('workflow-publish-button')).toBeDisabled();
			});
		});

		it('shows noChanges callout (not reattempt) in idle status with no changes', () => {
			// Ensure status is idle (not residual from prior tests)
			workflowDocumentStore.setPublicationStatus({ status: 'idle' });

			const { getByTestId, queryByTestId } = renderComponent();

			expect(getByTestId('workflow-publish-callout-no-changes')).toBeInTheDocument();
			expect(queryByTestId('workflow-publish-callout-reattempt')).not.toBeInTheDocument();
		});
	});

	describe('run-as mismatch callout', () => {
		const CURRENT_USER_ID = 'current-user';
		const OTHER_USER_ID = 'other-user';

		let settingsStore: ReturnType<typeof useSettingsStore>;
		let usersStore: ReturnType<typeof useUsersStore>;

		beforeEach(() => {
			settingsStore = useSettingsStore();
			usersStore = useUsersStore();

			settingsStore.settings = {
				...settingsStore.settings,
				envFeatureFlags: { N8N_ENV_FEAT_DYNAMIC_CREDENTIALS_RUN_AS: true },
				activeModules: ['dynamic-credentials'],
			};

			usersStore.usersById = {
				[CURRENT_USER_ID]: { id: CURRENT_USER_ID, fullName: 'Me' } as IUser,
				[OTHER_USER_ID]: { id: OTHER_USER_ID, fullName: 'Ada Lovelace' } as IUser,
			};
			usersStore.currentUserId = CURRENT_USER_ID;

			// An enabled Schedule Trigger alongside the webhook trigger already on the workflow
			workflowDocumentStore.setNodes([
				{
					id: 'trigger-1',
					name: 'Webhook Trigger',
					type: WEBHOOK_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					disabled: false,
				},
				{
					id: 'schedule-1',
					name: 'Schedule Trigger',
					type: SCHEDULE_TRIGGER_NODE_TYPE,
					typeVersion: 1,
					position: [100, 0],
					parameters: {},
					disabled: false,
				},
			]);
		});

		it('shows the callout with a link to the trigger and disables Publish when the setting names another user', async () => {
			workflowDocumentStore.mergeSettings({ runAsUserId: OTHER_USER_ID });

			const { getByTestId, getByText } = renderComponent();

			await waitFor(() => {
				expect(getByTestId('workflow-publish-callout-run-as')).toBeInTheDocument();
			});
			expect(
				getByText(
					'The schedule is set to run as Ada Lovelace. Switch the trigger to run as you before publishing.',
				),
			).toBeInTheDocument();
			expect(getByText('Schedule Trigger')).toBeInTheDocument();
			expect(getByTestId('workflow-publish-button')).toBeDisabled();
		});

		it('does not show the callout when the setting names the current user', () => {
			workflowDocumentStore.mergeSettings({ runAsUserId: CURRENT_USER_ID });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-callout-run-as')).not.toBeInTheDocument();
		});

		it('does not show the callout when the setting is unset', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-callout-run-as')).not.toBeInTheDocument();
		});

		it('does not show the callout when the env feature flag is off', () => {
			settingsStore.settings = {
				...settingsStore.settings,
				envFeatureFlags: { N8N_ENV_FEAT_DYNAMIC_CREDENTIALS_RUN_AS: false },
			};
			workflowDocumentStore.mergeSettings({ runAsUserId: OTHER_USER_ID });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-callout-run-as')).not.toBeInTheDocument();
		});

		it('does not show the callout when the dynamic-credentials module is not active', () => {
			settingsStore.settings = {
				...settingsStore.settings,
				activeModules: [],
			};
			workflowDocumentStore.mergeSettings({ runAsUserId: OTHER_USER_ID });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-callout-run-as')).not.toBeInTheDocument();
		});

		it('does not show the callout without an enabled Schedule Trigger', () => {
			workflowDocumentStore.setNodes([
				{
					id: 'trigger-1',
					name: 'Webhook Trigger',
					type: WEBHOOK_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					disabled: false,
				},
				{
					id: 'schedule-1',
					name: 'Schedule Trigger',
					type: SCHEDULE_TRIGGER_NODE_TYPE,
					typeVersion: 1,
					position: [100, 0],
					parameters: {},
					disabled: true,
				},
			]);
			workflowDocumentStore.mergeSettings({ runAsUserId: OTHER_USER_ID });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-callout-run-as')).not.toBeInTheDocument();
		});
	});
});
