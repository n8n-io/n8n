import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, ref, computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { render, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { NodeDiffStatus } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { createComponentRenderer } from '@/__tests__/render';

// Capture applyLayout prop from SyncedWorkflowCanvas
let capturedApplyLayoutProps: { top: boolean | undefined; bottom: boolean | undefined } = {
	top: undefined,
	bottom: undefined,
};

// Mock SyncedWorkflowCanvas to capture applyLayout prop
vi.mock('@/features/workflows/workflowDiff/SyncedWorkflowCanvas.vue', () => ({
	default: defineComponent({
		name: 'SyncedWorkflowCanvas',
		props: ['id', 'nodes', 'connections', 'applyLayout'],
		setup(props) {
			if (props.id === 'top') {
				capturedApplyLayoutProps.top = props.applyLayout;
			} else if (props.id === 'bottom') {
				capturedApplyLayoutProps.bottom = props.applyLayout;
			}
			return () => h('div', { 'data-test-id': `synced-canvas-${props.id}` });
		},
	}),
}));

// Mock useProvideViewportSync
vi.mock('@/features/workflows/workflowDiff/useViewportSync', () => ({
	useProvideViewportSync: () => ({
		selectedDetailId: ref(undefined),
		onNodeClick: vi.fn(),
		syncIsEnabled: ref(true),
	}),
}));

// Mock useWorkflowDiff
vi.mock('@/features/workflows/workflowDiff/useWorkflowDiff', () => ({
	useWorkflowDiff: vi.fn(),
}));

vi.mock('@/app/plugins/telemetry', () => ({
	telemetry: { track: vi.fn() },
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ instanceId: 'test-instance' }),
}));

// Mock element-plus dropdown components to make @visible-change testable in jsdom
vi.mock('element-plus', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		ElDropdown: defineComponent({
			props: ['trigger', 'popperOptions', 'popperClass'],
			emits: ['visible-change'],
			setup(_, { slots, emit }) {
				return () =>
					h('div', [
						h(
							'button',
							{
								'data-test-id': 'el-dropdown-trigger',
								onClick: () => emit('visible-change', true),
							},
							slots.default?.(),
						),
						h('div', { 'data-test-id': 'el-dropdown-content' }, slots.dropdown?.()),
					]);
			},
		}),
		ElDropdownMenu: defineComponent({
			setup(_, { slots }) {
				return () => h('div', slots.default?.());
			},
		}),
		ElDropdownItem: defineComponent({
			emits: ['click'],
			setup(_, { slots, emit }) {
				return () =>
					h(
						'li',
						{ class: 'workflow-diff-node-item', onClick: (e: Event) => emit('click', e) },
						slots.default?.(),
					);
			},
		}),
	};
});

// Mock stores
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
		getNodeType: vi.fn().mockReturnValue({ name: 'Test', version: 1 }),
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useI18n: () => ({
			baseText: (key: string) => key,
		}),
	};
});

// Mock child components
vi.mock('./HighlightedEdge.vue', () => ({
	default: defineComponent({
		name: 'HighlightedEdge',
		setup() {
			return () => h('div');
		},
	}),
}));

vi.mock('./WorkflowDiffAside.vue', () => ({
	default: defineComponent({
		name: 'WorkflowDiffAside',
		setup() {
			return () => h('div');
		},
	}),
}));

vi.mock('@/features/workflows/canvas/composables/useCanvasMapping', () => ({
	useCanvasMapping: vi.fn().mockReturnValue({
		additionalNodePropertiesById: computed(() => ({})),
		nodeExecutionRunDataOutputMapById: computed(() => ({})),
		nodeExecutionWaitingForNextById: computed(() => ({})),
		nodeHasIssuesById: computed(() => ({})),
		nodes: computed(() => []),
		connections: computed(() => []),
	}),
}));

// Import after mocks
import WorkflowDiffView from './WorkflowDiffView.vue';
import { useWorkflowDiff } from '@/features/workflows/workflowDiff/useWorkflowDiff';
import { telemetry } from '@/app/plugins/telemetry';

const defaultWorkflowDiffMock = () =>
	({
		source: { nodes: [], connections: [] },
		target: { nodes: [], connections: [] },
		nodesDiff: ref(new Map()),
		connectionsDiff: ref(new Map()),
	}) as unknown as ReturnType<typeof useWorkflowDiff>;

describe('WorkflowDiffView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedApplyLayoutProps = { top: undefined, bottom: undefined };
		createTestingPinia();
		vi.mocked(useWorkflowDiff).mockReturnValue(defaultWorkflowDiffMock());
	});

	describe('tidyUp prop', () => {
		const createMockWorkflow = (id: string, name: string) => ({
			id,
			name,
			nodes: [],
			connections: {},
			active: false,
			isArchived: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			versionId: '1',
			activeVersionId: null,
			homeProject: {
				id: 'project-1',
				name: 'Project',
				type: 'personal' as const,
				icon: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		});

		const sourceWorkflow = createMockWorkflow('source-workflow', 'Source Workflow');
		const targetWorkflow = createMockWorkflow('target-workflow', 'Target Workflow');

		it('should pass applyLayout=true to both SyncedWorkflowCanvas when tidyUp is true', () => {
			render(WorkflowDiffView, {
				props: {
					sourceWorkflow,
					targetWorkflow,
					tidyUp: true,
				},
			});

			expect(capturedApplyLayoutProps.top).toBe(true);
			expect(capturedApplyLayoutProps.bottom).toBe(true);
		});

		it('should pass applyLayout=false to both SyncedWorkflowCanvas when tidyUp is false', () => {
			render(WorkflowDiffView, {
				props: {
					sourceWorkflow,
					targetWorkflow,
					tidyUp: false,
				},
			});

			expect(capturedApplyLayoutProps.top).toBe(false);
			expect(capturedApplyLayoutProps.bottom).toBe(false);
		});

		it('should pass applyLayout as falsy when tidyUp is undefined', () => {
			render(WorkflowDiffView, {
				props: {
					sourceWorkflow,
					targetWorkflow,
				},
			});

			// When tidyUp is undefined, applyLayout will be falsy (false)
			expect(capturedApplyLayoutProps.top).toBeFalsy();
			expect(capturedApplyLayoutProps.bottom).toBeFalsy();
		});
	});

	describe('changes dropdown', () => {
		const createMockWorkflow = (id: string, name: string) => ({
			id,
			name,
			nodes: [],
			connections: {},
			active: false,
			isArchived: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			versionId: '1',
			activeVersionId: null,
			homeProject: {
				id: 'project-1',
				name: 'Project',
				type: 'personal' as const,
				icon: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		});

		const sourceWorkflow = createMockWorkflow('source-workflow-id', 'Source Workflow');
		const targetWorkflow = createMockWorkflow('target-workflow-id', 'Target Workflow');

		const renderView = createComponentRenderer(WorkflowDiffView, {
			global: {
				stubs: {
					SyncedWorkflowCanvas: { template: '<div />' },
					WorkflowDiffAside: { template: '<div />' },
					HighlightedEdge: { template: '<div />' },
				},
			},
		});

		it('should open the changes dropdown and track the event', async () => {
			const { getByTestId } = renderView({
				props: {
					sourceWorkflow,
					targetWorkflow,
					source: 'version_history',
				},
			});

			await userEvent.click(getByTestId('el-dropdown-trigger'));

			await waitFor(() => {
				expect(telemetry.track).toHaveBeenCalledWith('user_opens_diff_changes_list', {
					instance_id: 'test-instance',
					workflow_id: sourceWorkflow.id,
					source: 'version_history',
				});
			});
		});

		it('should select a node from the changes list and track the event', async () => {
			const mockNode: INodeUi = {
				id: 'node-1',
				name: 'Test Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			};

			vi.mocked(useWorkflowDiff).mockReturnValue({
				...defaultWorkflowDiffMock(),
				nodesDiff: ref(new Map([['node-1', { status: NodeDiffStatus.Added, node: mockNode }]])),
			} as unknown as ReturnType<typeof useWorkflowDiff>);

			const { getByTestId, getByText } = renderView({
				props: {
					sourceWorkflow,
					targetWorkflow,
					source: 'push_pull_modal',
				},
			});

			await userEvent.click(getByTestId('el-dropdown-trigger'));

			await waitFor(() => expect(getByText('Test Node')).toBeInTheDocument());
			await userEvent.click(getByText('Test Node'));

			await waitFor(() => {
				expect(telemetry.track).toHaveBeenCalledWith('user_clicks_node_in_diff_changes_list', {
					instance_id: 'test-instance',
					workflow_id: sourceWorkflow.id,
					node_id: 'node-1',
					node_name: 'Test Node',
					node_status: NodeDiffStatus.Added,
					source: 'push_pull_modal',
				});
			});
		});
	});
});
