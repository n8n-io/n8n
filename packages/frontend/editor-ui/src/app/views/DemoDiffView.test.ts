import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { ref, computed } from 'vue';
import type * as I18nModule from '@n8n/i18n';

// Mock the stores and composables
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		versionCli: '1.0.0',
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

// Capture props from WorkflowDiffView
let capturedTidyUpProp: boolean | undefined = undefined;
let capturedSourceLabel: string | undefined = undefined;
let capturedTargetLabel: string | undefined = undefined;

const renderComponent = createComponentRenderer(DemoDiffView, {
	global: {
		stubs: {
			WorkflowDiffView: {
				template: '<div data-test-id="workflow-diff-view"><slot /></div>',
				props: ['sourceWorkflow', 'targetWorkflow', 'sourceLabel', 'targetLabel', 'tidyUp'],
				setup(props: { tidyUp?: boolean; sourceLabel?: string; targetLabel?: string }) {
					capturedTidyUpProp = props.tidyUp;
					capturedSourceLabel = props.sourceLabel;
					capturedTargetLabel = props.targetLabel;
					return {};
				},
			},
		},
	},
});

describe('DemoDiffView', () => {
	let messageHandler: ((event: MessageEvent) => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		capturedTidyUpProp = undefined;
		capturedSourceLabel = undefined;
		capturedTargetLabel = undefined;

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

		expect(postMessageSpy).toHaveBeenCalledWith(expect.stringContaining('n8nReady'), '*');
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

		// Assert the i18n keys for labels are passed to WorkflowDiffView
		expect(capturedSourceLabel).toBe('workflowDiff.label.before');
		expect(capturedTargetLabel).toBe('workflowDiff.label.after');
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

	describe('input validation', () => {
		it('should reject message when oldWorkflow is missing nodes property', async () => {
			const { queryByTestId } = renderComponent();

			if (messageHandler) {
				messageHandler(
					new MessageEvent('message', {
						data: JSON.stringify({
							command: 'openDiff',
							oldWorkflow: { id: 'invalid', name: 'Invalid', connections: {} },
							newWorkflow: { id: 'new', name: 'New', nodes: [], connections: {} },
						}),
					}),
				);
			}

			// Wait for any potential Vue updates, then verify component did NOT render
			await new Promise((r) => setTimeout(r, 50));
			expect(queryByTestId('workflow-diff-view')).not.toBeInTheDocument();
		});

		it('should reject message when newWorkflow is missing connections property', async () => {
			const { queryByTestId } = renderComponent();

			if (messageHandler) {
				messageHandler(
					new MessageEvent('message', {
						data: JSON.stringify({
							command: 'openDiff',
							oldWorkflow: { id: 'old', name: 'Old', nodes: [], connections: {} },
							newWorkflow: { id: 'invalid', name: 'Invalid', nodes: [] },
						}),
					}),
				);
			}

			// Wait for any potential Vue updates, then verify component did NOT render
			await new Promise((r) => setTimeout(r, 50));
			expect(queryByTestId('workflow-diff-view')).not.toBeInTheDocument();
		});

		it('should reject message when workflow is not an object', async () => {
			const { queryByTestId } = renderComponent();

			if (messageHandler) {
				messageHandler(
					new MessageEvent('message', {
						data: JSON.stringify({
							command: 'openDiff',
							oldWorkflow: 'not an object',
							newWorkflow: { id: 'new', name: 'New', nodes: [], connections: {} },
						}),
					}),
				);
			}

			// Wait for any potential Vue updates, then verify component did NOT render
			await new Promise((r) => setTimeout(r, 50));
			expect(queryByTestId('workflow-diff-view')).not.toBeInTheDocument();
		});

		it('should accept valid workflows with nodes and connections', async () => {
			const { getByTestId } = renderComponent();

			if (messageHandler) {
				messageHandler(
					new MessageEvent('message', {
						data: JSON.stringify({
							command: 'openDiff',
							oldWorkflow: { id: 'old', name: 'Old', nodes: [], connections: {} },
							newWorkflow: { id: 'new', name: 'New', nodes: [], connections: {} },
						}),
					}),
				);
			}

			await vi.waitFor(() => {
				expect(getByTestId('workflow-diff-view')).toBeInTheDocument();
			});
		});

		it('should allow undefined workflows (partial diff)', async () => {
			const { getByTestId } = renderComponent();

			if (messageHandler) {
				messageHandler(
					new MessageEvent('message', {
						data: JSON.stringify({
							command: 'openDiff',
							oldWorkflow: undefined,
							newWorkflow: { id: 'new', name: 'New', nodes: [], connections: {} },
						}),
					}),
				);
			}

			await vi.waitFor(() => {
				expect(getByTestId('workflow-diff-view')).toBeInTheDocument();
			});
		});
	});

	describe('tidyUp prop', () => {
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

		it('should pass tidyUp=true to WorkflowDiffView when tidyUp option is true', async () => {
			const { getByTestId } = renderComponent();

			if (messageHandler) {
				messageHandler(
					new MessageEvent('message', {
						data: JSON.stringify({
							command: 'openDiff',
							oldWorkflow,
							newWorkflow,
							tidyUp: true,
						}),
					}),
				);
			}

			await vi.waitFor(() => {
				expect(getByTestId('workflow-diff-view')).toBeInTheDocument();
			});

			expect(capturedTidyUpProp).toBe(true);
		});

		it('should pass tidyUp=false when tidyUp option is false', async () => {
			const { getByTestId } = renderComponent();

			if (messageHandler) {
				messageHandler(
					new MessageEvent('message', {
						data: JSON.stringify({
							command: 'openDiff',
							oldWorkflow,
							newWorkflow,
							tidyUp: false,
						}),
					}),
				);
			}

			await vi.waitFor(() => {
				expect(getByTestId('workflow-diff-view')).toBeInTheDocument();
			});

			expect(capturedTidyUpProp).toBe(false);
		});

		it('should pass tidyUp=false when tidyUp option is not provided', async () => {
			const { getByTestId } = renderComponent();

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
				expect(getByTestId('workflow-diff-view')).toBeInTheDocument();
			});

			expect(capturedTidyUpProp).toBe(false);
		});
	});
});
