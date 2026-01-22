import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, ref, computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import type * as I18nModule from '@n8n/i18n';

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
	useWorkflowDiff: () => ({
		source: { nodes: [], connections: [] },
		target: { nodes: [], connections: [] },
		nodesDiff: ref(new Map()),
		connectionsDiff: ref(new Map()),
	}),
}));

// Mock stores
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
		getNodeType: vi.fn().mockReturnValue({ name: 'Test', version: 1 }),
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = (await importOriginal()) as typeof I18nModule;
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

describe('WorkflowDiffView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedApplyLayoutProps = { top: undefined, bottom: undefined };
		createTestingPinia();
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
});
