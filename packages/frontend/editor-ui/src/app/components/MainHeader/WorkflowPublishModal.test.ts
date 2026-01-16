import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import WorkflowPublishModal from '@/app/components/MainHeader/WorkflowPublishModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	WORKFLOW_PUBLISH_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
} from '@/app/constants';
import { STORES } from '@n8n/stores';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

const mockCheckConflictingWebhooks = vi.fn();
const mockPublishWorkflow = vi.fn();

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => ({
		checkConflictingWebhooks: mockCheckConflictingWebhooks,
	}),
}));

vi.mock('@/app/composables/useWorkflowActivate', () => ({
	useWorkflowActivate: () => ({
		publishWorkflow: mockPublishWorkflow,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
	}),
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
			WorkflowPublishForm: {
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
	let uiStore: MockedStore<typeof useUIStore>;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);

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

		mockCheckConflictingWebhooks.mockReset();
		mockPublishWorkflow.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('handlePublish with conflicting webhooks', () => {
		it('should use workflow name when fetching conflicting workflow succeeds', async () => {
			const conflictData = {
				trigger: { type: WEBHOOK_NODE_TYPE },
				conflict: {
					workflowId: 'conflicting-workflow-123',
					webhookPath: '/test-path',
					method: 'GET',
					node: 'Webhook in other workflow',
				},
			};
			mockCheckConflictingWebhooks.mockResolvedValue(conflictData);
			workflowsStore.fetchWorkflow.mockResolvedValue({
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

			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { getByTestId } = renderComponent();

			const versionInput = getByTestId('workflow-publish-version-name-input');
			await userEvent.type(versionInput, 'v1.0.0');

			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith('conflicting-workflow-123');
				expect(openModalSpy).toHaveBeenCalledWith({
					name: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
					data: expect.objectContaining({
						workflowName: 'Conflicting Workflow Name',
						triggerType: WEBHOOK_NODE_TYPE,
					}),
				});
			});
		});

		it('should use fallback message when fetching conflicting workflow fails due to permissions', async () => {
			const conflictData = {
				trigger: { type: WEBHOOK_NODE_TYPE },
				conflict: {
					workflowId: 'inaccessible-workflow-456',
					webhookPath: '/test-path',
					method: 'GET',
					node: 'Webhook in other workflow',
				},
			};
			mockCheckConflictingWebhooks.mockResolvedValue(conflictData);
			workflowsStore.fetchWorkflow.mockRejectedValue(new Error('Access denied'));

			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { getByTestId } = renderComponent();

			const versionInput = getByTestId('workflow-publish-version-name-input');
			await userEvent.type(versionInput, 'v1.0.0');

			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith('inaccessible-workflow-456');
				expect(openModalSpy).toHaveBeenCalledWith({
					name: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
					data: expect.objectContaining({
						workflowName: 'Unknown workflow (ID: inaccessible-workflow-456)',
						triggerType: WEBHOOK_NODE_TYPE,
					}),
				});
			});
		});

		it('should not proceed to publish when there is a conflicting webhook', async () => {
			const conflictData = {
				trigger: { type: WEBHOOK_NODE_TYPE },
				conflict: {
					workflowId: 'conflicting-workflow-123',
					webhookPath: '/test-path',
					method: 'GET',
					node: 'Webhook in other workflow',
				},
			};
			mockCheckConflictingWebhooks.mockResolvedValue(conflictData);
			workflowsStore.fetchWorkflow.mockResolvedValue({
				id: 'conflicting-workflow-123',
				name: 'Conflicting Workflow',
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
				expect(mockPublishWorkflow).not.toHaveBeenCalled();
			});
		});
	});

	describe('handlePublish without conflicts', () => {
		it('should proceed to publish when there are no conflicting webhooks', async () => {
			mockCheckConflictingWebhooks.mockResolvedValue(null);
			mockPublishWorkflow.mockResolvedValue(true);

			const { getByTestId } = renderComponent();

			const versionInput = getByTestId('workflow-publish-version-name-input');
			await userEvent.type(versionInput, 'v1.0.0');

			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(mockPublishWorkflow).toHaveBeenCalledWith(
					'workflow-1',
					'new-version',
					expect.objectContaining({
						name: 'v1.0.0',
					}),
				);
			});
		});
	});
});
