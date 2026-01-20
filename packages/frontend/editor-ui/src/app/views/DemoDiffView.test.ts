import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { ref, computed } from 'vue';

// Mock the stores and composables
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		versionCli: '1.0.0',
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/i18n')>();
	return {
		...actual,
		useI18n: () => ({
			baseText: (key: string) => key,
		}),
	};
});

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
		getNodeType: vi.fn().mockReturnValue({
			name: 'Test Node Type',
			version: 1,
		}),
	}),
}));

vi.mock('@/features/workflows/workflowDiff/useViewportSync', () => ({
	useProvideViewportSync: () => ({
		selectedDetailId: ref(undefined),
		onNodeClick: vi.fn(),
		syncIsEnabled: ref(true),
	}),
	useInjectViewportSync: () => ({
		triggerViewportChange: vi.fn(),
		onViewportChange: vi.fn(),
		selectedDetailId: ref(undefined),
		triggerNodeClick: vi.fn(),
	}),
}));

vi.mock('@/features/workflows/workflowDiff/useWorkflowDiff', () => ({
	useWorkflowDiff: () => ({
		source: { nodes: [], connections: [] },
		target: { nodes: [], connections: [] },
		nodesDiff: ref(new Map()),
		connectionsDiff: ref(new Map()),
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		createWorkflowObject: vi.fn().mockReturnValue({
			id: 'test-workflow',
			nodes: [],
			connections: {},
		}),
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
import DemoDiffView from './DemoDiffView.vue';

const renderComponent = createComponentRenderer(DemoDiffView, {
	global: {
		stubs: {
			WorkflowDiffView: {
				template: '<div data-test-id="workflow-diff-view"><slot /></div>',
				props: ['oldWorkflow', 'newWorkflow', 'oldLabel', 'newLabel'],
			},
		},
	},
});

describe('DemoDiffView', () => {
	let messageHandler: ((event: MessageEvent) => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();

		// Capture the message event handler
		vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
			if (type === 'message') {
				messageHandler = handler as (event: MessageEvent) => void;
			}
		});

		vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
	});

	afterEach(() => {
		messageHandler = null;
	});

	it('should mount successfully', () => {
		const { container } = renderComponent();
		expect(container).toBeTruthy();
	});

	it('should listen for postMessage events on mount', () => {
		renderComponent();
		expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
	});

	it('should emit n8nReady message on mount', () => {
		const postMessageSpy = vi.spyOn(window.parent, 'postMessage');
		renderComponent();

		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.stringContaining('n8nReady'),
			'*',
		);
	});

	it('should handle openDiff command and pass workflows to WorkflowDiffView', async () => {
		const { getByTestId } = renderComponent();

		const oldWorkflow = {
			id: 'old-workflow',
			name: 'Old Workflow',
			nodes: [],
			connections: {},
		};

		const newWorkflow = {
			id: 'new-workflow',
			name: 'New Workflow',
			nodes: [],
			connections: {},
		};

		// Simulate postMessage
		if (messageHandler) {
			messageHandler(
				new MessageEvent('message', {
					data: JSON.stringify({
						command: 'openDiff',
						oldWorkflow,
						newWorkflow,
					}),
				}),
			);
		}

		// Wait for Vue to update
		await vi.waitFor(() => {
			expect(getByTestId('workflow-diff-view')).toBeInTheDocument();
		});
	});

	it('should use "Before" and "After" as default labels', async () => {
		const { getByTestId } = renderComponent();

		const oldWorkflow = {
			id: 'old-workflow',
			name: 'Old Workflow',
			nodes: [],
			connections: {},
		};

		const newWorkflow = {
			id: 'new-workflow',
			name: 'New Workflow',
			nodes: [],
			connections: {},
		};

		if (messageHandler) {
			messageHandler(
				new MessageEvent('message', {
					data: JSON.stringify({
						command: 'openDiff',
						oldWorkflow,
						newWorkflow,
					}),
				}),
			);
		}

		await vi.waitFor(() => {
			const diffView = getByTestId('workflow-diff-view');
			expect(diffView).toBeInTheDocument();
		});
	});

	it('should ignore non-openDiff commands', () => {
		const { queryByTestId } = renderComponent();

		if (messageHandler) {
			messageHandler(
				new MessageEvent('message', {
					data: JSON.stringify({
						command: 'someOtherCommand',
						data: {},
					}),
				}),
			);
		}

		// WorkflowDiffView should not be rendered without workflows
		expect(queryByTestId('workflow-diff-view')).not.toBeInTheDocument();
	});

	it('should ignore malformed messages', () => {
		const { queryByTestId } = renderComponent();

		if (messageHandler) {
			messageHandler(
				new MessageEvent('message', {
					data: 'not valid json {{{',
				}),
			);
		}

		expect(queryByTestId('workflow-diff-view')).not.toBeInTheDocument();
	});
});
