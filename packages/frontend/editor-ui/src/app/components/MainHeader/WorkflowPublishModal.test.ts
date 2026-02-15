import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import WorkflowPublishModal from '@/app/components/MainHeader/WorkflowPublishModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

const mockPublishWorkflow = vi.fn();
const mockShowMessage = vi.fn();
const mockTelemetryTrack = vi.fn();

vi.mock('@/app/composables/useWorkflowActivate', () => ({
	useWorkflowActivate: () => ({
		publishWorkflow: mockPublishWorkflow,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
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
		modalsById: {
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

describe('WorkflowPublishModal', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		workflowsStore.workflow = {
			id: 'workflow-1',
			name: 'Test Workflow',
			active: false,
			activeVersionId: null,
			activeVersion: {
				versionId: 'old-version',
				authors: 'Test Author',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				workflowPublishHistory: [],
				name: 'Published Version',
				description: null,
			},
			versionId: 'new-version',
			isArchived: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			nodes: [],
			connections: {},
		};

		workflowsStore.workflowTriggerNodes = [
			{
				id: 'trigger-1',
				name: 'Webhook Trigger',
				type: WEBHOOK_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				disabled: false,
			},
		];

		workflowsStore.nodesIssuesExist = false;
		workflowsStore.nodesWithIssues = [];

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

		it('should show warning when publish fails with unhandled error', async () => {
			mockPublishWorkflow.mockReset().mockResolvedValue({
				success: false,
				errorHandled: false,
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
				expect(mockShowMessage).toHaveBeenCalledWith({
					message: 'Sorry there was a problem requesting the error',
					title: 'Problem activating workflow',
					type: 'warning',
					duration: 0,
				});
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
});
