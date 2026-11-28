import { createTestNode, createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useHistoryHelper } from '@/app/composables/useHistoryHelper';
import { useNodeDirtiness } from '@/app/composables/useNodeDirtiness';
import {
	MANUAL_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
} from '@/app/constants';
import { type INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { CanvasNodeDirtiness } from '@/features/workflows/canvas/canvas.types';
import { createTestingPinia } from '@pinia/testing';
import {
	createRunExecutionData,
	NodeConnectionTypes,
	type IConnections,
	type IRunData,
} from 'n8n-workflow';
import { defineComponent, provide, shallowRef } from 'vue';
import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded } from 'vue-router';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';

const TEST_WORKFLOW_ID = 'test-workflow-id';
const TEST_DOCUMENT_ID = createWorkflowDocumentId(TEST_WORKFLOW_ID);

describe(useNodeDirtiness, () => {
	let nodeTypeStore: ReturnType<typeof useNodeTypesStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let historyHelper: ReturnType<typeof useHistoryHelper>;
	let canvasOperations: ReturnType<typeof useCanvasOperations>;
	let uiStore: ReturnType<typeof useUIStore>;

	const NODE_RUN_AT = new Date('2025-01-01T00:00:01');
	const WORKFLOW_UPDATED_AT = new Date('2025-01-01T00:00:10');

	beforeEach(() => {
		vi.useFakeTimers();

		const TestComponent = defineComponent({
			setup() {
				nodeTypeStore = useNodeTypesStore();
				workflowsStore = useWorkflowsStore();
				workflowsStore.setWorkflowId(TEST_WORKFLOW_ID);
				historyHelper = useHistoryHelper(
					{} as RouteLocationNormalizedLoaded,
					shallowRef(null) as Parameters<typeof useHistoryHelper>[1],
				);

				workflowDocumentStore = useWorkflowDocumentStore(TEST_DOCUMENT_ID);
				provide(WorkflowDocumentStoreKey, shallowRef(workflowDocumentStore));

				canvasOperations = useCanvasOperations();
				uiStore = useUIStore();

				nodeTypeStore.setNodeTypes(defaultNodeDescriptions);
			},
			template: '<div />',
		});

		createComponentRenderer(TestComponent, {
			global: {
				plugins: [
					createTestingPinia({ stubActions: false, fakeApp: true }),
					createRouter({
						history: createWebHistory(),
						routes: [{ path: '/', component: TestComponent }],
					}),
				],
			},
		})();
	});

	it('should be an empty object if no change has been made to the workflow', () => {
		setupTestWorkflow('a🚨✅, b✅, c✅');

		expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
	});

	describe('injecting a node', () => {
		it('should mark a node as dirty if a new node is injected as its parent', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅');

			uiStore.lastInteractedWithNodeConnection = {
				source: workflowDocumentStore.nodesByName.a.id,
				target: workflowDocumentStore.nodesByName.b.id,
			};
			uiStore.lastInteractedWithNodeId = workflowDocumentStore.nodesByName.a.id;
			uiStore.lastInteractedWithNodeHandle = 'outputs/main/0';

			await canvasOperations.addNodes([createTestNode({ name: 'c' })], { trackHistory: true });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('deleting a node', () => {
		it('should mark a node as dirty if a parent node is replaced by removing a node', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.deleteNodes([workflowDocumentStore.nodesByName.b.id], {
				trackHistory: true,
			}); // 'a' becomes new parent of 'c'

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should mark a node as dirty if a parent node get removed', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.deleteNodes([workflowDocumentStore.nodesByName.a.id], {
				trackHistory: true,
			}); // 'b' has no parent node anymore

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('replacing a node with one that reuses its name', () => {
		it('should not mark the replacement as dirty', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a\u{1F6A8}\u2705 -> b\u2705');

			// Delete and replace through the canvas the way the editor does, so the
			// history records the replacement after the run. The new node reuses the
			// freed name but never ran.
			canvasOperations.deleteNodes([workflowDocumentStore.nodesByName.b.id], {
				trackHistory: true,
			});

			await canvasOperations.addNodes([createTestNode({ name: 'b', type: SET_NODE_TYPE })], {
				trackHistory: true,
			});

			canvasOperations.createConnection(
				{
					source: workflowDocumentStore.nodesByName.a.id,
					target: workflowDocumentStore.nodesByName.b.id,
				},
				{ trackHistory: true },
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value.b).toBeUndefined();
		});

		it('should still mark the node that ran as dirty when its parameters change', () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a\u{1F6A8}\u2705 -> b\u2705');

			workflowDocumentStore.setNodeParameters({
				name: 'b',
				value: { param: 'changed' },
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});
	});

	describe('updating node parameters', () => {
		it('should mark a node as dirty if its parameter has changed', () => {
			setupTestWorkflow('a🚨✅, b✅, c✅');

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.b.id, { foo: 1 });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should clear dirtiness if a dirty node gets new run data', () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.b.id, { foo: 1 });

			const runAt = new Date(+WORKFLOW_UPDATED_AT + 1000);

			useWorkflowExecutionStateStore(
				createWorkflowDocumentId(workflowsStore.workflowId),
			).setWorkflowExecutionData({
				id: workflowsStore.workflowId,
				finished: true,
				mode: 'manual',
				status: 'success',
				workflowData: workflowDocumentStore.getSnapshot(),
				startedAt: runAt,
				createdAt: runAt,
				data: createRunExecutionData({
					resultData: {
						runData: {
							b: [
								{
									startTime: +runAt,
									executionTime: 0,
									executionIndex: 0,
									executionStatus: 'success',
									source: [],
								},
							],
						},
					},
				}),
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
		});

		it("should not update dirtiness if the node hasn't run yet", () => {
			setupTestWorkflow('a🚨✅, b, c✅');

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.b.id, { foo: 1 });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
		});

		it('should not update dirtiness when the notes field is updated', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)).setNodeValue({
				key: 'notes',
				name: 'b',
				value: 'test',
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
		});
	});

	describe('adding a connection', () => {
		it('should mark a node as dirty if a new incoming connection is added', () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.createConnection(
				{
					source: workflowDocumentStore.nodesByName.a.id,
					target: workflowDocumentStore.nodesByName.c.id,
				},
				{ trackHistory: true },
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('removing a connection', () => {
		it('should not change dirtiness', () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.deleteConnection(
				{
					source: workflowDocumentStore.nodesByName.a.id,
					target: workflowDocumentStore.nodesByName.b.id,
				},
				{ trackHistory: true },
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
		});
	});

	describe('enabling/disabling nodes', () => {
		it('should mark downstream nodes dirty if the node is set to disabled', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅ -> d✅');

			canvasOperations.toggleNodesDisabled([workflowDocumentStore.nodesByName.b.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should not mark anything dirty if a disabled node is set to enabled', () => {
			setupTestWorkflow('a🚨✅ -> b🚫 -> c✅ -> d✅');

			canvasOperations.toggleNodesDisabled([workflowDocumentStore.nodesByName.b.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
		});

		it('should restore original dirtiness after undoing a command', async () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅ -> d✅');

			canvasOperations.toggleNodesDisabled([workflowDocumentStore.nodesByName.b.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});

			await historyHelper.undo();

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
		});
	});

	describe('pinned data', () => {
		it('should not change dirtiness when data is pinned', async () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.toggleNodesPinned(
				[workflowDocumentStore.nodesByName.b.id],
				'pin-icon-click',
				{
					trackHistory: true,
				},
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({});
		});

		it('should update dirtiness when pinned data is removed from a node with run data', async () => {
			setupTestWorkflow('a🚨✅ -> b✅📌 -> c✅, b -> d, b -> e✅ -> f✅');

			canvasOperations.toggleNodesPinned(
				[workflowDocumentStore.nodesByName.b.id],
				'pin-icon-click',
				{
					trackHistory: true,
				},
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
			});
		});

		it('should update dirtiness when an existing pinned data of an incoming node is updated', async () => {
			setupTestWorkflow('a🚨✅ -> b✅📌 -> c✅, b -> d, b -> e✅ -> f✅');

			// Simulate updating pinned data for node 'b' (set metadata timestamp as usePinnedData.setData would)
			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowsStore.workflowId),
			);
			workflowDocumentStore.touchPinnedDataLastUpdatedAt('b');

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				// 'd' is not marked as pinned-data-updated because it has no run data.
				c: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
				e: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
			});
		});
	});

	describe('sub-nodes', () => {
		it('should mark its parent nodes with run data as dirty when parameters of a sub node has changed', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d🧠 -> b, e🧠 -> f✅🧠 -> b');

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.e.id, { foo: 1 });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				// 'e' itself is not marked as parameters-updated, because it has no run data.
				f: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				b: CanvasNodeDirtiness.UPSTREAM_DIRTY,
			});
		});

		it('should change dirtiness if a disabled sub node is set to enabled', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d🧠🚫 -> b');

			canvasOperations.toggleNodesDisabled([workflowDocumentStore.nodesByName.d.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should change dirtiness if a sub node is removed', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d🧠 -> b');

			canvasOperations.deleteNodes([workflowDocumentStore.nodesByName.d.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('workflow with a loop', () => {
		it('should change the dirtiness of the first node in a loop when one of nodes in the loop becomes dirty', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅ -> d✅ -> e✅ -> f✅ -> c✅');

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.e.id, { foo: 1 });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				e: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should not choose a node as the first node in a loop if all nodes in the loop have incoming connections', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d✅ -> e✅ -> d✅, d -> b');

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.c.id, { foo: 1 });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		// CAP-232: Changing a node downstream of a completed loop must not mark the loop dirty.
		it('should not mark a completed loop as dirty when a node directly downstream of the loop is modified', () => {
			setupCompletedLoopWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterLoop.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				afterLoop: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		// CAP-232: Changing a node further downstream of a completed loop must not mark the loop dirty.
		it('should not mark a completed loop as dirty when a node further downstream of the loop is modified', () => {
			setupCompletedLoopWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.finalNode.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				finalNode: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the loop entry node as dirty when a node inside a completed loop is modified', () => {
			setupCompletedLoopWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.inLoop.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				inLoop: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should not mark a completed loop as dirty when an incoming connection is added downstream of the loop', () => {
			setupCompletedLoopWorkflow();

			canvasOperations.createConnection(
				{
					source: workflowDocumentStore.nodesByName.trigger.id,
					target: workflowDocumentStore.nodesByName.afterLoop.id,
				},
				{ trackHistory: true },
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				afterLoop: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should not mark a completed loop as dirty when a downstream node is disabled', () => {
			setupCompletedLoopWorkflow();

			canvasOperations.toggleNodesDisabled([workflowDocumentStore.nodesByName.afterLoop.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				finalNode: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should not mark a completed loop as dirty when pinned data is updated downstream of the loop', () => {
			setupCompletedLoopWorkflow();

			workflowDocumentStore.pinNodeData('afterLoop', [{ json: { value: 1 } }]);
			workflowDocumentStore.clearPinnedDataTimestamps('afterLoop');
			workflowDocumentStore.touchPinnedDataLastUpdatedAt('afterLoop');

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				finalNode: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
			});
		});

		it('should not mark a completed loop as dirty when pinned data is removed downstream of the loop', () => {
			setupCompletedLoopWorkflow();

			workflowDocumentStore.pinNodeData('afterLoop', [{ json: { value: 1 } }]);
			workflowDocumentStore.clearPinnedDataTimestamps('afterLoop');

			canvasOperations.toggleNodesPinned(
				[workflowDocumentStore.nodesByName.afterLoop.id],
				'pin-icon-click',
				{ trackHistory: true },
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				afterLoop: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
			});
		});

		it('should not mark a completed loop as dirty after copying execution data to the editor and editing a downstream node', () => {
			setupCompletedLoopWorkflow();

			// Copy to editor pins root trigger data and clears pinned data timestamps.
			workflowDocumentStore.pinNodeData('trigger', [{ json: { value: 1 } }]);
			workflowDocumentStore.clearPinnedDataTimestamps('trigger');

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterLoop.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				afterLoop: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the loop entry node as dirty when a dead-end side branch inside the loop body is modified', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'http', type: SET_NODE_TYPE }),
					createTestNode({ name: 'appendRow', type: SET_NODE_TYPE }),
					createTestNode({ name: 'afterLoop', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'afterLoop', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'http', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					http: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'appendRow', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.appendRow.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				appendRow: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the loop entry node as dirty when a dead-end secondary output branch inside the loop body is modified', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'inLoop', type: SET_NODE_TYPE }),
					createTestNode({ name: 'errorStep', type: SET_NODE_TYPE }),
					createTestNode({ name: 'errorSink', type: SET_NODE_TYPE }),
					createTestNode({ name: 'afterLoop', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'afterLoop', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'inLoop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inLoop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'errorStep', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					errorStep: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'errorSink', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.errorSink.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				errorSink: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the loop entry node as dirty when a dead-end branch off the loop output is modified', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'inLoop', type: SET_NODE_TYPE }),
					createTestNode({ name: 'logBatch', type: SET_NODE_TYPE }),
					createTestNode({ name: 'afterLoop', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'afterLoop', type: NodeConnectionTypes.Main, index: 0 }],
							[
								{ node: 'inLoop', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'logBatch', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
					inLoop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.logBatch.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				logBatch: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the loop entry node as dirty when a downstream node also receives input from inside the loop body', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'inLoop', type: SET_NODE_TYPE }),
					createTestNode({ name: 'merge', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'merge', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'inLoop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inLoop: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'merge', type: NodeConnectionTypes.Main, index: 1 },
							],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.merge.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				merge: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should keep marking SplitInBatches v2 loops dirty when a downstream done branch changes', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 2 }),
					createTestNode({ name: 'inLoop', type: SET_NODE_TYPE }),
					createTestNode({ name: 'afterLoop', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'inLoop', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'afterLoop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inLoop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterLoop.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				afterLoop: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should keep marking SplitInBatches v1 loops dirty when a downstream branch changes', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 1 }),
					createTestNode({ name: 'inLoop', type: SET_NODE_TYPE }),
					createTestNode({ name: 'deadEnd', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'inLoop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inLoop: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'deadEnd', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.deadEnd.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				deadEnd: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should not mark sequential completed loops as dirty when a downstream node changes', () => {
			setupSequentialLoopsWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterSecond.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				afterSecond: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should only mark the containing loop entry node dirty in sequential loops', () => {
			setupSequentialLoopsWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.inSecond.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop2: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				inSecond: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should only mark the containing loop entry node dirty for a dead-end branch in the second sequential loop', () => {
			setupSequentialLoopsWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.deadEndInSecond.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop2: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				deadEndInSecond: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should not mark nested loops as dirty when a node downstream of the outer loop changes', () => {
			setupNestedLoopsWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterOuter.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				afterOuter: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the outer loop entry node dirty when a node in the outer loop body after an inner loop changes', () => {
			setupNestedLoopsWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterInner.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				outerLoop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				afterInner: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the outer loop entry node dirty when a node inside a nested inner loop changes', () => {
			setupNestedLoopsWorkflow();

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.inInner.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				outerLoop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				inInner: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the outer loop entry node dirty when a dead-end branch off an inner loop done output changes', () => {
			setupNestedLoopsWorkflow();

			canvasOperations.setNodeParameters(
				workflowDocumentStore.nodesByName.deadEndAfterInnerDone.id,
				{ foo: 1 },
			);

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				outerLoop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				deadEndAfterInnerDone: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark the outer loop entry node dirty for a nested loop on a dead-end branch of an outer loop', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'outerLoop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'inOuter', type: SET_NODE_TYPE }),
					createTestNode({ name: 'innerLoop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'inInner', type: SET_NODE_TYPE }),
					createTestNode({ name: 'afterInnerDeadEnd', type: SET_NODE_TYPE }),
					createTestNode({ name: 'afterOuter', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'outerLoop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					outerLoop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'afterOuter', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'inOuter', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inOuter: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'outerLoop', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'innerLoop', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
					innerLoop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'afterInnerDeadEnd', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'inInner', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inInner: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'innerLoop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterInnerDeadEnd.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				outerLoop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				afterInnerDeadEnd: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should mark both loop entry nodes dirty when dead-end branches from parallel loops converge', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop1', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'inLoop1', type: SET_NODE_TYPE }),
					createTestNode({ name: 'loop2', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'inLoop2', type: SET_NODE_TYPE }),
					createTestNode({ name: 'sharedDeadEnd', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'loop1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'loop2', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
					loop1: {
						[NodeConnectionTypes.Main]: [
							null,
							[{ node: 'inLoop1', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inLoop1: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'loop1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'sharedDeadEnd', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
					loop2: {
						[NodeConnectionTypes.Main]: [
							null,
							[{ node: 'inLoop2', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					inLoop2: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'loop2', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'sharedDeadEnd', type: NodeConnectionTypes.Main, index: 1 },
							],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.sharedDeadEnd.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loop1: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				loop2: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				sharedDeadEnd: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should handle self-loops without marking a SplitInBatches done branch dirty', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
					createTestNode({ name: 'afterLoop', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loop: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'afterLoop', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.afterLoop.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				afterLoop: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should choose the loop entry node with the shortest distance from the trigger', () => {
			setupExecutedWorkflow(
				[
					createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'long1', type: SET_NODE_TYPE }),
					createTestNode({ name: 'long2', type: SET_NODE_TYPE }),
					createTestNode({ name: 'loopA', type: SET_NODE_TYPE }),
					createTestNode({ name: 'loopB', type: SET_NODE_TYPE }),
				],
				{
					trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'long1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'loopB', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
					long1: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'long2', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					long2: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loopA', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loopA: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loopB', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					loopB: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'loopA', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
			);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.loopA.id, { foo: 1 });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				loopA: CanvasNodeDirtiness.PARAMETERS_UPDATED,
				loopB: CanvasNodeDirtiness.UPSTREAM_DIRTY,
			});
		});

		it('should compute loop entry depths in linear time across repeated diamond branches', () => {
			const diamondCount = 30;
			const nodes: INodeUi[] = [
				createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
				createTestNode({ name: 'unrelated', type: SET_NODE_TYPE }),
				createTestNode({ name: 'loop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
				createTestNode({ name: 'inLoop', type: SET_NODE_TYPE }),
				createTestNode({ name: 'afterLoop', type: SET_NODE_TYPE }),
			];
			const connections: IConnections = {
				trigger: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'split0', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'unrelated', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};

			for (let i = 0; i < diamondCount; i++) {
				const split = `split${i}`;
				const left = `left${i}`;
				const right = `right${i}`;
				const merge = `merge${i}`;
				const nextTarget = i + 1 < diamondCount ? `split${i + 1}` : 'loop';

				nodes.push(
					createTestNode({ name: split, type: SET_NODE_TYPE }),
					createTestNode({ name: left, type: SET_NODE_TYPE }),
					createTestNode({ name: right, type: SET_NODE_TYPE }),
					createTestNode({ name: merge, type: SET_NODE_TYPE }),
				);

				connections[split] = {
					[NodeConnectionTypes.Main]: [
						[{ node: left, type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: right, type: NodeConnectionTypes.Main, index: 0 }],
					],
				};
				connections[left] = {
					[NodeConnectionTypes.Main]: [[{ node: merge, type: NodeConnectionTypes.Main, index: 0 }]],
				};
				connections[right] = {
					[NodeConnectionTypes.Main]: [[{ node: merge, type: NodeConnectionTypes.Main, index: 1 }]],
				};
				connections[merge] = {
					[NodeConnectionTypes.Main]: [
						[{ node: nextTarget, type: NodeConnectionTypes.Main, index: 0 }],
					],
				};
			}

			connections.loop = {
				[NodeConnectionTypes.Main]: [
					[{ node: 'afterLoop', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'inLoop', type: NodeConnectionTypes.Main, index: 0 }],
				],
			};
			connections.inLoop = {
				[NodeConnectionTypes.Main]: [[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }]],
			};

			setupExecutedWorkflow(nodes, connections);

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.unrelated.id, {
				foo: 1,
			});

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				unrelated: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});

			canvasOperations.setNodeParameters(workflowDocumentStore.nodesByName.inLoop.id, { foo: 1 });

			expect(useNodeDirtiness(TEST_DOCUMENT_ID).dirtinessByName.value).toEqual({
				unrelated: CanvasNodeDirtiness.PARAMETERS_UPDATED,
				loop: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				inLoop: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});
	});

	function setupExecutedWorkflow(
		nodes: INodeUi[],
		connections: IConnections,
		customRunData?: IRunData,
	) {
		const runData: IRunData = customRunData ?? {};

		if (!customRunData) {
			for (const node of nodes) {
				runData[node.name] = [
					{
						startTime: +NODE_RUN_AT,
						executionTime: 0,
						executionIndex: 0,
						executionStatus: 'success',
						source: [],
						data: {
							[NodeConnectionTypes.Main]: [[{ json: { value: 1 } }]],
						},
					},
				];
			}
		}

		const workflow = createTestWorkflow({ nodes, connections });

		const documentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
		documentStore.setNodes(workflow.nodes);
		documentStore.setConnections(workflow.connections);

		useWorkflowExecutionStateStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		).setWorkflowExecutionData({
			id: workflow.id,
			finished: true,
			mode: 'manual',
			status: 'success',
			workflowData: workflow,
			startedAt: NODE_RUN_AT,
			createdAt: NODE_RUN_AT,
			data: createRunExecutionData({ resultData: { runData } }),
		});

		vi.setSystemTime(WORKFLOW_UPDATED_AT);
	}

	function setupSequentialLoopsWorkflow() {
		setupExecutedWorkflow(
			[
				createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
				createTestNode({ name: 'loop1', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
				createTestNode({ name: 'inFirst', type: SET_NODE_TYPE }),
				createTestNode({ name: 'between', type: SET_NODE_TYPE }),
				createTestNode({ name: 'loop2', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
				createTestNode({ name: 'inSecond', type: SET_NODE_TYPE }),
				createTestNode({ name: 'deadEndInSecond', type: SET_NODE_TYPE }),
				createTestNode({ name: 'afterSecond', type: SET_NODE_TYPE }),
			],
			{
				trigger: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'loop1', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				loop1: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'between', type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: 'inFirst', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				inFirst: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'loop1', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				between: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'loop2', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				loop2: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'afterSecond', type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: 'inSecond', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				inSecond: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'loop2', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'deadEndInSecond', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			},
		);
	}

	function setupNestedLoopsWorkflow() {
		setupExecutedWorkflow(
			[
				createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
				createTestNode({ name: 'outerLoop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
				createTestNode({ name: 'innerLoop', type: SPLIT_IN_BATCHES_NODE_TYPE, typeVersion: 3 }),
				createTestNode({ name: 'inInner', type: SET_NODE_TYPE }),
				createTestNode({ name: 'afterInner', type: SET_NODE_TYPE }),
				createTestNode({ name: 'deadEndAfterInnerDone', type: SET_NODE_TYPE }),
				createTestNode({ name: 'afterOuter', type: SET_NODE_TYPE }),
			],
			{
				trigger: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'outerLoop', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				outerLoop: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'afterOuter', type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: 'innerLoop', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				innerLoop: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'afterInner', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'deadEndAfterInnerDone', type: NodeConnectionTypes.Main, index: 0 },
						],
						[{ node: 'inInner', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				inInner: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'innerLoop', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				afterInner: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'outerLoop', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			},
		);
	}

	/**
	 * Sets up a workflow with a completed SplitInBatches loop and downstream nodes:
	 * trigger -> loop --(done: 0)--> afterLoop -> finalNode
	 *                 --(loop: 1)--> inLoop -> loop
	 */
	function setupCompletedLoopWorkflow() {
		const trigger = createTestNode({ name: 'trigger', type: MANUAL_TRIGGER_NODE_TYPE });
		const loop = createTestNode({
			name: 'loop',
			type: SPLIT_IN_BATCHES_NODE_TYPE,
			typeVersion: 3,
		});
		const inLoop = createTestNode({ name: 'inLoop', type: SET_NODE_TYPE });
		const afterLoop = createTestNode({ name: 'afterLoop', type: SET_NODE_TYPE });
		const finalNode = createTestNode({ name: 'finalNode', type: SET_NODE_TYPE });

		const connections: IConnections = {
			trigger: {
				[NodeConnectionTypes.Main]: [[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			loop: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'afterLoop', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'inLoop', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			inLoop: {
				[NodeConnectionTypes.Main]: [[{ node: 'loop', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			afterLoop: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'finalNode', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
		};

		const runData: IRunData = {
			trigger: [
				{
					startTime: +NODE_RUN_AT,
					executionTime: 0,
					executionIndex: 0,
					executionStatus: 'success',
					source: [],
					data: {
						[NodeConnectionTypes.Main]: [[{ json: { value: 1 } }]],
					},
				},
			],
			loop: [
				{
					startTime: +NODE_RUN_AT,
					executionTime: 0,
					executionIndex: 1,
					executionStatus: 'success',
					source: [{ previousNode: 'trigger' }],
					data: {
						[NodeConnectionTypes.Main]: [[], [{ json: { value: 1 } }]],
					},
				},
				{
					startTime: +NODE_RUN_AT,
					executionTime: 0,
					executionIndex: 3,
					executionStatus: 'success',
					source: [{ previousNode: 'inLoop' }],
					data: {
						[NodeConnectionTypes.Main]: [[{ json: { value: 1 } }], []],
					},
				},
			],
			inLoop: [
				{
					startTime: +NODE_RUN_AT,
					executionTime: 0,
					executionIndex: 2,
					executionStatus: 'success',
					source: [{ previousNode: 'loop', previousNodeOutput: 1, previousNodeRun: 0 }],
					data: {
						[NodeConnectionTypes.Main]: [[{ json: { value: 1 } }]],
					},
				},
			],
			afterLoop: [
				{
					startTime: +NODE_RUN_AT,
					executionTime: 0,
					executionIndex: 4,
					executionStatus: 'success',
					source: [{ previousNode: 'loop', previousNodeOutput: 0, previousNodeRun: 1 }],
					data: {
						[NodeConnectionTypes.Main]: [[{ json: { value: 1 } }]],
					},
				},
			],
			finalNode: [
				{
					startTime: +NODE_RUN_AT,
					executionTime: 0,
					executionIndex: 5,
					executionStatus: 'success',
					source: [{ previousNode: 'afterLoop' }],
					data: {
						[NodeConnectionTypes.Main]: [[{ json: { value: 1 } }]],
					},
				},
			],
		};

		setupExecutedWorkflow([trigger, loop, inLoop, afterLoop, finalNode], connections, runData);
	}

	/**
	 * Setup test data in the workflow store using given diagram.
	 *
	 * [Symbols]
	 * - 🚨: Trigger node
	 * - ✅: Node with run data
	 * - 🚫: Disabled node
	 * - 📌: Node with pinned data
	 * - 🧠: A sub node
	 */
	function setupTestWorkflow(diagram: string) {
		const nodeNamesWithPinnedData = new Set<string>();
		const nodes: Record<string, INodeUi> = {};
		const connections: IConnections = {};
		const runData: IRunData = {};

		for (const subGraph of diagram.split(/\n|,/).filter((line) => line.trim() !== '')) {
			const elements = subGraph.split(/(->)/).map((s) => s.trim());

			elements.forEach((element, i, arr) => {
				if (element === '->') {
					const from = arr[i - 1].slice(0, 1);
					const to = arr[i + 1].slice(0, 1);
					const type = arr[i - 1].includes('🧠')
						? NodeConnectionTypes.AiAgent
						: NodeConnectionTypes.Main;
					const conns = connections[from]?.[type] ?? [];
					const conn = conns[0] ?? [];

					connections[from] = {
						...connections[from],
						[type]: [[...conn, { node: to, type, index: conn.length }], ...conns.slice(1)],
					};
					return;
				}

				const [name, ...attributes] = element.trim();

				nodes[name] =
					nodes[name] ??
					createTestNode({
						name,
						disabled: attributes.includes('🚫'),
						type: attributes.includes('🚨') ? MANUAL_TRIGGER_NODE_TYPE : SET_NODE_TYPE,
					});

				if (attributes.includes('✅')) {
					runData[name] = [
						{
							startTime: +NODE_RUN_AT,
							executionTime: 0,
							executionIndex: 0,
							executionStatus: 'success',
							source: [],
						},
					];
				}

				if (attributes.includes('📌')) {
					nodeNamesWithPinnedData.add(name);
				}
			});
		}

		const workflow = createTestWorkflow({ nodes: Object.values(nodes), connections });

		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
		workflowDocumentStore.setNodes(workflow.nodes);
		workflowDocumentStore.setConnections(workflow.connections);

		for (const name of nodeNamesWithPinnedData) {
			workflowDocumentStore.pinNodeData(name, [{ json: {} }]);
		}

		useWorkflowExecutionStateStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		).setWorkflowExecutionData({
			id: workflow.id,
			finished: true,
			mode: 'manual',
			status: 'success',
			workflowData: workflow,
			startedAt: NODE_RUN_AT,
			createdAt: NODE_RUN_AT,
			data: createRunExecutionData({ resultData: { runData } }),
		});

		// prepare for making changes to the workflow
		vi.setSystemTime(WORKFLOW_UPDATED_AT);
	}
});
