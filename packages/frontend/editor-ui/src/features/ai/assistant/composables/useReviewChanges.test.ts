import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { useReviewChanges } from './useReviewChanges';
import type { INode, IConnections } from 'n8n-workflow';

const canvasEventBusEmitMock = vi.fn();

vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: { emit: (...args: unknown[]) => canvasEventBusEmitMock(...args) },
}));

const compareWorkflowsNodesMock = vi.fn();
const getNodeParametersMock = vi.fn();

vi.mock('n8n-workflow', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('n8n-workflow');
	const actualNodeHelpers = actual.NodeHelpers as Record<string, unknown>;
	return {
		...actual,
		compareWorkflowsNodes: (...args: unknown[]) => compareWorkflowsNodesMock(...args),
		NodeHelpers: new Proxy(actualNodeHelpers, {
			get(target, prop) {
				if (prop === 'getNodeParameters') return getNodeParametersMock;
				return Reflect.get(target, prop);
			},
		}),
		NodeDiffStatus: {
			Eq: 'equal',
			Modified: 'modified',
			Added: 'added',
			Deleted: 'deleted',
		},
	};
});

vi.mock('@n8n/utils/event-bus', () => ({
	createEventBus: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }),
}));

vi.mock('@n8n/i18n', () => {
	const baseText = (key: string) => key;
	return {
		i18n: { baseText },
		useI18n: () => ({ baseText }),
	};
});

// Store mocks - reactive so Vue watchers can track property changes
const mockBuilderStore = reactive({
	streaming: false,
	latestRevertVersion: null as { id: string } | null,
	trackWorkflowBuilderJourney: vi.fn() as ReturnType<typeof vi.fn>,
});

const mockWorkflowsStore = reactive({
	workflowId: 'wf-1',
	workflow: { id: 'wf-1', nodes: [] as INode[], connections: {} as IConnections },
});

const mockWorkflowHistoryStore = reactive({
	getWorkflowVersion: vi.fn() as ReturnType<typeof vi.fn>,
});

const mockNodeTypesStore = reactive({
	getNodeType: vi.fn().mockReturnValue(null) as ReturnType<typeof vi.fn>,
});

const mockUIStore = reactive({
	openModalWithData: vi.fn() as ReturnType<typeof vi.fn>,
});

const mockPosthogStore = reactive({
	isFeatureEnabled: vi.fn().mockReturnValue(false) as ReturnType<typeof vi.fn>,
});

const mockChatPanelStateStore = reactive({
	isOpen: true,
});

vi.mock('@/features/ai/assistant/builder.store', () => ({
	useBuilderStore: () => mockBuilderStore,
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => mockWorkflowsStore,
}));

vi.mock('@/features/workflows/workflowHistory/workflowHistory.store', () => ({
	useWorkflowHistoryStore: () => mockWorkflowHistoryStore,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => mockNodeTypesStore,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => mockUIStore,
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => mockPosthogStore,
}));

vi.mock('@/features/ai/assistant/chatPanelState.store', () => ({
	useChatPanelStateStore: () => mockChatPanelStateStore,
}));

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'node-1',
		name: 'Node 1',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INode;
}

function withSetup() {
	let result!: ReturnType<typeof useReviewChanges>;
	const comp = defineComponent({
		setup() {
			result = useReviewChanges();
			return () => null;
		},
	});
	const wrapper = mount(comp);
	return { result, unmount: () => wrapper.unmount() };
}

async function flushPromises() {
	await new Promise((r) => setTimeout(r, 0));
	await nextTick();
}

describe('useReviewChanges', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();

		// Reset store mocks
		mockBuilderStore.streaming = false;
		mockBuilderStore.latestRevertVersion = null;
		mockBuilderStore.trackWorkflowBuilderJourney = vi.fn();

		mockWorkflowsStore.workflowId = 'wf-1';
		mockWorkflowsStore.workflow = { id: 'wf-1', nodes: [], connections: {} };

		mockWorkflowHistoryStore.getWorkflowVersion = vi.fn();

		mockNodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);

		mockUIStore.openModalWithData = vi.fn();

		mockPosthogStore.isFeatureEnabled = vi.fn().mockReturnValue(false);

		mockChatPanelStateStore.isOpen = true;

		compareWorkflowsNodesMock.mockReturnValue(new Map());
		getNodeParametersMock.mockImplementation((_props: unknown, params: unknown) => params);

		canvasEventBusEmitMock.mockClear();
	});

	describe('nodeChanges', () => {
		it('should return empty array when cachedVersionLoaded is false', () => {
			// No revert version means cachedVersionLoaded stays false
			const { result, unmount } = withSetup();
			expect(result.nodeChanges.value).toEqual([]);
			unmount();
		});

		it('should return empty array when streaming is true', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode()],
				connections: {},
			});

			const { result, unmount } = withSetup();
			await flushPromises();

			// Now set streaming to true
			mockBuilderStore.streaming = true;
			await nextTick();

			expect(result.nodeChanges.value).toEqual([]);
			unmount();
		});

		it('should compute diff correctly filtering out Eq nodes', async () => {
			const oldNode = makeNode({ id: 'n1', name: 'Old' });
			const addedNode = makeNode({ id: 'n2', name: 'Added' });
			const currentNode = makeNode({ id: 'n1', name: 'Modified' });

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [oldNode],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [currentNode, addedNode],
				connections: {},
			};

			compareWorkflowsNodesMock.mockReturnValue(
				new Map([
					['n1', { status: 'modified', node: oldNode }],
					['n2', { status: 'added', node: addedNode }],
					['n3', { status: 'equal', node: makeNode({ id: 'n3' }) }],
				]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.nodeChanges.value).toHaveLength(2);
			expect(result.nodeChanges.value[0].status).toBe('modified');
			// Modified nodes use current version from the store
			expect(result.nodeChanges.value[0].node).toStrictEqual(currentNode);
			expect(result.nodeChanges.value[1].status).toBe('added');
			expect(result.nodeChanges.value[1].node).toStrictEqual(addedNode);
			unmount();
		});

		it('should use the cached node for Deleted status', async () => {
			const deletedNode = makeNode({ id: 'n-del', name: 'Deleted' });

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [deletedNode],
				connections: {},
			});
			mockWorkflowsStore.workflow = { id: 'wf-1', nodes: [], connections: {} };

			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['n-del', { status: 'deleted', node: deletedNode }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.nodeChanges.value).toHaveLength(1);
			expect(result.nodeChanges.value[0].status).toBe('deleted');
			expect(result.nodeChanges.value[0].node).toBe(deletedNode);
			unmount();
		});
	});

	describe('editedNodesCount', () => {
		it('should match nodeChanges length', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode()],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};

			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['node-1', { status: 'modified', node: makeNode() }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.editedNodesCount.value).toBe(result.nodeChanges.value.length);
			expect(result.editedNodesCount.value).toBe(1);
			unmount();
		});
	});

	describe('showReviewChanges', () => {
		function setupWithChanges() {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockBuilderStore.streaming = false;
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode()],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['node-1', { status: 'modified', node: makeNode() }]]),
			);
			mockPosthogStore.isFeatureEnabled.mockReturnValue(true);
		}

		it('should return true when all conditions are met', async () => {
			setupWithChanges();
			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.showReviewChanges.value).toBe(true);
			unmount();
		});

		it('should return false when feature flag is disabled', async () => {
			setupWithChanges();
			mockPosthogStore.isFeatureEnabled.mockReturnValue(false);
			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.showReviewChanges.value).toBe(false);
			unmount();
		});

		it('should return false when streaming', async () => {
			setupWithChanges();
			mockBuilderStore.streaming = true;
			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.showReviewChanges.value).toBe(false);
			unmount();
		});

		it('should return false when no revert version', async () => {
			setupWithChanges();
			mockBuilderStore.latestRevertVersion = null;
			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.showReviewChanges.value).toBe(false);
			unmount();
		});

		it('should return false when no changes', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [],
				connections: {},
			});
			mockPosthogStore.isFeatureEnabled.mockReturnValue(true);
			compareWorkflowsNodesMock.mockReturnValue(new Map());

			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.showReviewChanges.value).toBe(false);
			unmount();
		});
	});

	describe('toggleExpanded', () => {
		it('should flip isExpanded and track expand event', () => {
			const { result, unmount } = withSetup();

			expect(result.isExpanded.value).toBe(false);
			result.toggleExpanded();
			expect(result.isExpanded.value).toBe(true);
			expect(mockBuilderStore.trackWorkflowBuilderJourney).toHaveBeenCalledWith(
				'user_expanded_review_changes',
			);
			unmount();
		});

		it('should track collapse event when toggling back', () => {
			const { result, unmount } = withSetup();

			result.toggleExpanded(); // expand
			result.toggleExpanded(); // collapse
			expect(result.isExpanded.value).toBe(false);
			expect(mockBuilderStore.trackWorkflowBuilderJourney).toHaveBeenLastCalledWith(
				'user_collapsed_review_changes',
			);
			unmount();
		});
	});

	describe('canvas highlights', () => {
		it('should apply highlights when expanded and clear when collapsed', async () => {
			const addedNode = makeNode({ id: 'n-added' });
			const modifiedNode = makeNode({ id: 'n-modified' });

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [modifiedNode],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [modifiedNode, addedNode],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([
					['n-modified', { status: 'modified', node: modifiedNode }],
					['n-added', { status: 'added', node: addedNode }],
				]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			// Expand to trigger highlights
			result.toggleExpanded();
			await nextTick();

			// Should emit add:true for both changed nodes
			const addCalls = canvasEventBusEmitMock.mock.calls.filter(
				(call: unknown[]) =>
					call[0] === 'nodes:action' &&
					(call[1] as Record<string, unknown>).action === 'update:node:class' &&
					(call[1] as Record<string, Record<string, unknown>>).payload.add === true,
			);
			expect(addCalls.length).toBe(2);

			canvasEventBusEmitMock.mockClear();

			// Collapse to clear highlights
			result.toggleExpanded();
			await nextTick();

			// Should emit add:false to remove classes
			const removeCalls = canvasEventBusEmitMock.mock.calls.filter(
				(call: unknown[]) =>
					call[0] === 'nodes:action' &&
					(call[1] as Record<string, unknown>).action === 'update:node:class' &&
					(call[1] as Record<string, Record<string, unknown>>).payload.add === false,
			);
			expect(removeCalls.length).toBeGreaterThan(0);
			unmount();
		});

		it('should not highlight nodes with Deleted status (no class mapping)', async () => {
			const deletedNode = makeNode({ id: 'n-del' });

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [deletedNode],
				connections: {},
			});
			mockWorkflowsStore.workflow = { id: 'wf-1', nodes: [], connections: {} };
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['n-del', { status: 'deleted', node: deletedNode }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			canvasEventBusEmitMock.mockClear();
			result.toggleExpanded();
			await nextTick();

			// Deleted nodes have no class mapping, so no add:true calls
			const addCalls = canvasEventBusEmitMock.mock.calls.filter(
				(call: unknown[]) =>
					call[0] === 'nodes:action' &&
					(call[1] as Record<string, unknown>).action === 'update:node:class' &&
					(call[1] as Record<string, Record<string, unknown>>).payload.add === true,
			);
			expect(addCalls.length).toBe(0);
			unmount();
		});
	});

	describe('auto-collapse watchers', () => {
		it('should auto-collapse and clear highlights when streaming starts', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode()],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['node-1', { status: 'modified', node: makeNode() }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			result.toggleExpanded();
			await nextTick();
			expect(result.isExpanded.value).toBe(true);

			canvasEventBusEmitMock.mockClear();

			// Start streaming
			mockBuilderStore.streaming = true;
			await nextTick();

			expect(result.isExpanded.value).toBe(false);
			// Should have emitted clear calls
			const removeCalls = canvasEventBusEmitMock.mock.calls.filter(
				(call: unknown[]) =>
					call[0] === 'nodes:action' &&
					(call[1] as Record<string, Record<string, unknown>>).payload.add === false,
			);
			expect(removeCalls.length).toBeGreaterThan(0);
			unmount();
		});

		it('should not collapse when streaming starts if already collapsed', async () => {
			const { result, unmount } = withSetup();
			await flushPromises();

			expect(result.isExpanded.value).toBe(false);

			mockBuilderStore.streaming = true;
			await nextTick();

			expect(result.isExpanded.value).toBe(false);
			unmount();
		});

		it('should auto-collapse and clear highlights when builder panel is closed', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode()],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['node-1', { status: 'modified', node: makeNode() }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			result.toggleExpanded();
			await nextTick();
			expect(result.isExpanded.value).toBe(true);

			canvasEventBusEmitMock.mockClear();

			// Close the panel
			mockChatPanelStateStore.isOpen = false;
			await nextTick();

			expect(result.isExpanded.value).toBe(false);
			const removeCalls = canvasEventBusEmitMock.mock.calls.filter(
				(call: unknown[]) =>
					call[0] === 'nodes:action' &&
					(call[1] as Record<string, Record<string, unknown>>).payload.add === false,
			);
			expect(removeCalls.length).toBeGreaterThan(0);
			unmount();
		});

		it('should auto-collapse and clear highlights when revert version changes', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode()],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['node-1', { status: 'modified', node: makeNode() }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			result.toggleExpanded();
			await nextTick();
			expect(result.isExpanded.value).toBe(true);

			canvasEventBusEmitMock.mockClear();

			// Change revert version
			mockBuilderStore.latestRevertVersion = { id: 'v-2' };
			await nextTick();

			expect(result.isExpanded.value).toBe(false);
			unmount();
		});
	});

	describe('unmount cleanup', () => {
		it('should clear canvas highlights on unmount', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode()],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['node-1', { status: 'modified', node: makeNode() }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			result.toggleExpanded();
			await nextTick();

			canvasEventBusEmitMock.mockClear();
			unmount();

			// Should have emitted clear calls on unmount
			const removeCalls = canvasEventBusEmitMock.mock.calls.filter(
				(call: unknown[]) =>
					call[0] === 'nodes:action' &&
					(call[1] as Record<string, Record<string, unknown>>).payload.add === false,
			);
			expect(removeCalls.length).toBeGreaterThan(0);
		});
	});

	describe('openDiffView', () => {
		it('should open modal with correct data when version is loaded', async () => {
			const cachedNodes = [makeNode({ id: 'cached-1' })];
			const cachedConnections: IConnections = {
				Node1: { main: [[{ node: 'Node2', type: 'main', index: 0 }]] },
			};

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: cachedNodes,
				connections: cachedConnections,
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(new Map());

			const { result, unmount } = withSetup();
			await flushPromises();

			result.openDiffView();

			expect(mockUIStore.openModalWithData).toHaveBeenCalledTimes(1);
			const callArg = mockUIStore.openModalWithData.mock.calls[0][0];
			expect(callArg.name).toBe('aiBuilderDiff');
			expect(callArg.data.sourceWorkflow.nodes).toEqual(cachedNodes);
			expect(callArg.data.sourceWorkflow.connections).toEqual(cachedConnections);
			expect(callArg.data.targetWorkflow).toBe(mockWorkflowsStore.workflow);
			expect(callArg.data.sourceLabel).toBe('aiAssistant.builder.reviewChanges.previousVersion');
			expect(callArg.data.targetLabel).toBe('aiAssistant.builder.reviewChanges.currentVersion');
			unmount();
		});

		it('should be a no-op when no revert version', async () => {
			mockBuilderStore.latestRevertVersion = null;

			const { result, unmount } = withSetup();
			await flushPromises();

			result.openDiffView();
			expect(mockUIStore.openModalWithData).not.toHaveBeenCalled();
			unmount();
		});

		it('should be a no-op when version not yet loaded', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			// Never resolve the version fetch
			mockWorkflowHistoryStore.getWorkflowVersion.mockReturnValue(new Promise(() => {}));

			const { result, unmount } = withSetup();
			// Do not await flushPromises so the version is still loading

			result.openDiffView();
			expect(mockUIStore.openModalWithData).not.toHaveBeenCalled();
			unmount();
		});
	});

	describe('version watcher', () => {
		it('should load version data from workflowHistoryStore', async () => {
			const versionNodes = [makeNode({ id: 'v-node' })];
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: versionNodes,
				connections: {},
			});
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };

			const { unmount } = withSetup();
			await flushPromises();

			expect(mockWorkflowHistoryStore.getWorkflowVersion).toHaveBeenCalledWith('wf-1', 'v-1');
			unmount();
		});

		it('should clear cached data when version becomes null', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockResolvedValue({
				nodes: [makeNode({ id: 'v-node' })],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(
				new Map([['v-node', { status: 'added', node: makeNode({ id: 'v-node' }) }]]),
			);

			const { result, unmount } = withSetup();
			await flushPromises();

			// Verify we have changes initially
			expect(result.nodeChanges.value.length).toBeGreaterThan(0);

			// Set version to null
			mockBuilderStore.latestRevertVersion = null;
			await flushPromises();

			// nodeChanges should be empty since cachedVersionLoaded is false
			expect(result.nodeChanges.value).toEqual([]);
			unmount();
		});

		it('should handle fetch errors gracefully', async () => {
			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion.mockRejectedValue(new Error('fetch failed'));
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(new Map());

			const { result, unmount } = withSetup();
			await flushPromises();

			// Should not throw, nodeChanges should be empty (no diff items)
			expect(result.nodeChanges.value).toEqual([]);
			unmount();
		});

		it('should discard stale version responses', async () => {
			let resolveFirst: ((value: unknown) => void) | undefined;
			const firstPromise = new Promise((r) => {
				resolveFirst = r;
			});

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode()],
				connections: {},
			};
			compareWorkflowsNodesMock.mockReturnValue(new Map());

			// Set up mock to return a pending promise for v-1, resolved value for v-2
			mockWorkflowHistoryStore.getWorkflowVersion = vi
				.fn()
				.mockImplementation(async (_wfId: string, versionId: string) => {
					if (versionId === 'v-1') return await firstPromise;
					return await Promise.resolve({
						nodes: [makeNode({ id: 'second' })],
						connections: {},
					});
				});

			const { unmount } = withSetup();
			await nextTick();

			// Change version before first resolves
			mockBuilderStore.latestRevertVersion = { id: 'v-2' };
			await nextTick();
			await flushPromises();

			// Resolve the first request (stale) - the stale guard should ignore it
			resolveFirst!({ nodes: [makeNode({ id: 'first' })], connections: {} });
			await flushPromises();

			// Both v-1 and v-2 should have been fetched
			expect(mockWorkflowHistoryStore.getWorkflowVersion).toHaveBeenCalledWith('wf-1', 'v-1');
			expect(mockWorkflowHistoryStore.getWorkflowVersion).toHaveBeenCalledWith('wf-1', 'v-2');
			unmount();
		});
	});

	describe('resolveNodeDefaults', () => {
		it('should call NodeHelpers.getNodeParameters when node type is found', async () => {
			const node = makeNode({ id: 'n1', type: 'test-type', parameters: { foo: 'bar' } });
			const resolvedParams = { foo: 'bar', baz: 'default' };
			const mockNodeType = { properties: [{ name: 'baz', default: 'default' }] };

			mockNodeTypesStore.getNodeType = vi.fn().mockReturnValue(mockNodeType);
			getNodeParametersMock.mockReturnValue(resolvedParams);

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion = vi.fn().mockResolvedValue({
				nodes: [node],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode({ id: 'n1' })],
				connections: {},
			};
			compareWorkflowsNodesMock.mockImplementation((base: INode[]) => {
				// Verify the base nodes have resolved parameters
				expect(base[0].parameters).toEqual(resolvedParams);
				return new Map([['n1', { status: 'modified', node: base[0] }]]);
			});

			const { result, unmount } = withSetup();
			await flushPromises();

			// Verify the computed ran and produced results
			expect(result.nodeChanges.value).toHaveLength(1);
			expect(compareWorkflowsNodesMock).toHaveBeenCalled();
			// getNodeParameters should have been called during resolveNodeDefaults
			expect(getNodeParametersMock).toHaveBeenCalled();
			unmount();
		});

		it('should return node as-is when node type is not found', async () => {
			const node = makeNode({
				id: 'n1',
				parameters: { original: true } as unknown as INode['parameters'],
			});

			mockNodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);

			mockBuilderStore.latestRevertVersion = { id: 'v-1' };
			mockWorkflowHistoryStore.getWorkflowVersion = vi.fn().mockResolvedValue({
				nodes: [node],
				connections: {},
			});
			mockWorkflowsStore.workflow = {
				id: 'wf-1',
				nodes: [makeNode({ id: 'n1' })],
				connections: {},
			};
			compareWorkflowsNodesMock.mockImplementation((base: INode[]) => {
				// Parameters should be unchanged
				expect(base[0].parameters).toEqual({ original: true });
				return new Map([['n1', { status: 'modified', node: base[0] }]]);
			});

			const { result, unmount } = withSetup();
			await flushPromises();

			expect(getNodeParametersMock).not.toHaveBeenCalled();
			expect(result.nodeChanges.value).toHaveLength(1);
			unmount();
		});
	});
});
