import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import WorkflowPublishModal from '@/app/components/MainHeader/WorkflowPublishModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';
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

const AI_GATEWAY_NODE = {
	id: 'ai-node-1',
	name: 'Message a model',
	type: '@n8n/n8n-nodes-langchain.lmOpenAi',
	typeVersion: 1,
	position: [100, 100] as [number, number],
	parameters: {},
	disabled: false,
	credentials: {
		openAiApi: { id: null, name: '', __aiGatewayManaged: true },
	},
};

describe('WorkflowPublishModal', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('workflow-1'));
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

	describe('AI gateway warning', () => {
		let settingsStore: MockedStore<typeof useSettingsStore>;

		beforeEach(() => {
			settingsStore = mockedStore(useSettingsStore);
			Object.assign(settingsStore.settings, { aiGateway: { enabled: true } });
		});

		afterEach(() => {
			Object.assign(settingsStore.settings, { aiGateway: { enabled: false } });
		});

		it('should not show warning when AI gateway is disabled', () => {
			Object.assign(settingsStore.settings, { aiGateway: { enabled: false } });
			workflowsStore.workflow = { ...workflowsStore.workflow, nodes: [AI_GATEWAY_NODE] };

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-ai-gateway-warning')).not.toBeInTheDocument();
		});

		it('should not show warning when no nodes have AI gateway credentials', () => {
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				nodes: [
					{
						id: 'regular-node',
						name: 'Regular Node',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [100, 100],
						parameters: {},
						disabled: false,
					},
				],
			};

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-ai-gateway-warning')).not.toBeInTheDocument();
		});

		it('should not show warning when the only AI gateway node is disabled', () => {
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				nodes: [{ ...AI_GATEWAY_NODE, disabled: true }],
			};

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-ai-gateway-warning')).not.toBeInTheDocument();
		});

		it('should show warning with node name for a single active AI gateway node', () => {
			workflowsStore.workflow = { ...workflowsStore.workflow, nodes: [AI_GATEWAY_NODE] };

			const { getByTestId } = renderComponent();

			const warning = getByTestId('workflow-publish-ai-gateway-warning');
			expect(warning).toBeInTheDocument();
			expect(warning).toHaveTextContent('Message a model');
		});

		it('should show singular copy for a single active AI gateway node', () => {
			workflowsStore.workflow = { ...workflowsStore.workflow, nodes: [AI_GATEWAY_NODE] };

			const { getByTestId } = renderComponent();

			const warning = getByTestId('workflow-publish-ai-gateway-warning');
			expect(warning).toHaveTextContent('The node');
			expect(warning).toHaveTextContent('uses an n8n Connect credential');
			expect(warning).toHaveTextContent(
				'Once your n8n Connect balance is depleted, this workflow will stop working.',
			);
			expect(warning).not.toHaveTextContent('Top-up');
		});

		it('should show warning with all node names for multiple active AI gateway nodes', () => {
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				nodes: [AI_GATEWAY_NODE, { ...AI_GATEWAY_NODE, id: 'ai-node-2', name: 'Generate Image' }],
			};

			const { getByTestId } = renderComponent();

			const warning = getByTestId('workflow-publish-ai-gateway-warning');
			expect(warning).toBeInTheDocument();
			expect(warning).toHaveTextContent('Message a model');
			expect(warning).toHaveTextContent('Generate Image');
		});

		it('should show plural copy for multiple active AI gateway nodes', () => {
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				nodes: [AI_GATEWAY_NODE, { ...AI_GATEWAY_NODE, id: 'ai-node-2', name: 'Generate Image' }],
			};

			const { getByTestId } = renderComponent();

			const warning = getByTestId('workflow-publish-ai-gateway-warning');
			expect(warning).toHaveTextContent('The nodes');
			expect(warning).toHaveTextContent('use n8n Connect credentials');
			expect(warning).toHaveTextContent(
				'Once your n8n Connect balance is depleted, this workflow will stop working.',
			);
			expect(warning).not.toHaveTextContent('Top-up');
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
