import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import WorkflowPublishModal from '@/features/workflows/components/WorkflowPublishModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { WEBHOOK_NODE_TYPE, NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

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

describe('WorkflowPublishModal', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
	let workflowHistoryStore: MockedStore<typeof useWorkflowHistoryStore>;
	let usersStore: MockedStore<typeof useUsersStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	const setUserCount = (count: number) => {
		usersStore.usersById = Object.fromEntries(
			Array.from({ length: count }, (_, i) => [`user-${i}`, { id: `user-${i}` }]),
		) as unknown as typeof usersStore.usersById;
	};

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowHistoryStore = mockedStore(useWorkflowHistoryStore);
		workflowHistoryStore.getWorkflowChangelog.mockResolvedValue(null);
		usersStore = mockedStore(useUsersStore);
		usersStore.fetchUsers.mockResolvedValue(undefined);
		setUserCount(2);

		// Register the webhook node type so workflowTriggerNodes computed recognises triggers
		const nodeTypesStore = useNodeTypesStore();
		nodeTypesStore.setNodeTypes([WEBHOOK_NODE_TYPE_DESCRIPTION]);

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

	describe('changelog since last publish', () => {
		const changelog = {
			authors: ['Alice', 'Bob'],
			from: '2024-03-01T09:00:00.000Z',
			to: '2024-03-02T10:00:00.000Z',
		};

		it('summarizes date range and authors of versions since the last publish', async () => {
			workflowHistoryStore.getWorkflowChangelog.mockResolvedValue(changelog);

			const { getByTestId } = renderComponent();

			await waitFor(() => {
				expect(getByTestId('workflow-publish-changelog')).toBeInTheDocument();
			});

			expect(getByTestId('workflow-publish-changelog')).toHaveTextContent(
				'Includes changes from 2024 Mar 1 to 2024 Mar 2 from Alice, Bob.',
			);
			expect(getByTestId('workflow-publish-changelog-history-link')).toHaveTextContent(
				'Go to history',
			);
		});

		it('omits the authors on a single-user instance', async () => {
			setUserCount(1);
			workflowHistoryStore.getWorkflowChangelog.mockResolvedValue(changelog);

			const { getByTestId } = renderComponent();

			await waitFor(() => {
				expect(getByTestId('workflow-publish-changelog')).toBeInTheDocument();
			});

			expect(getByTestId('workflow-publish-changelog')).toHaveTextContent(
				'Includes changes from 2024 Mar 1 to 2024 Mar 2.',
			);
			expect(getByTestId('workflow-publish-changelog')).not.toHaveTextContent('Alice');
			expect(getByTestId('workflow-publish-changelog-history-link')).toBeInTheDocument();
		});

		it('keeps the authors when the user count lookup fails', async () => {
			setUserCount(1);
			usersStore.fetchUsers.mockRejectedValue(new Error('network error'));
			workflowHistoryStore.getWorkflowChangelog.mockResolvedValue(changelog);

			const { getByTestId } = renderComponent();

			await waitFor(() => {
				expect(getByTestId('workflow-publish-changelog')).toBeInTheDocument();
			});

			expect(getByTestId('workflow-publish-changelog')).toHaveTextContent(
				'Includes changes from 2024 Mar 1 to 2024 Mar 2 from Alice, Bob.',
			);
		});

		it('is hidden when there are no versions since the last publish', async () => {
			workflowHistoryStore.getWorkflowChangelog.mockResolvedValue(null);

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(workflowHistoryStore.getWorkflowChangelog).toHaveBeenCalled();
			});
			expect(queryByTestId('workflow-publish-changelog')).not.toBeInTheDocument();
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
});
