import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import type { AddedNodesAndConnections } from '@/Interface';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import {
	EVALUATION_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	isEmptyGroupAnchor,
} from 'n8n-workflow';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '../stores/workflowDocument.store';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkflowsStore } from '../stores/workflows.store';
import { useWorkflowsListStore } from '../stores/workflowsList.store';
import { useWorkflowExecutionStateStore } from '../stores/workflowExecutionState.store';
import { useNodeTypesStore } from '../stores/nodeTypes.store';
import { useUIStore } from '../stores/ui.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { renderComponent } from '@/__tests__/render';
import NodeView from './NodeView.vue';
import {
	NODE_CREATOR_OPEN_SOURCES,
	NO_OP_NODE_TYPE,
	SET_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	VIEWS,
} from '../constants';
import { WorkflowIdKey, WorkflowDocumentStoreKey } from '../constants/injectionKeys';
import { computed, defineComponent, nextTick, shallowRef } from 'vue';
import { nodeViewEventBus } from '@/app/event-bus';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { useHistoryStore } from '@/app/stores/history.store';
import {
	AddConnectionCommand,
	AddNodeCommand,
	AddNodeGroupCommand,
	BulkCommand,
} from '@/app/models/history';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useCanvasStore } from '@/app/stores/canvas.store';
import { DEFAULT_NODE_SIZE, snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import { usePostHog } from '@/app/stores/posthog.store';

const mockMcpJsonNudgeGate = vi.hoisted(() => vi.fn());
// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
const mockGroupTelemetry = vi.hoisted(() => ({
	trackGrouped: vi.fn(),
	trackInitialEmptyGroupConnection: vi.fn(),
	trackUngrouped: vi.fn(),
	trackCollapsed: vi.fn(),
	trackExpanded: vi.fn(),
}));

vi.mock('@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeTrigger', () => ({
	useMcpJsonNudgeTrigger: () => ({ gate: mockMcpJsonNudgeGate }),
}));

// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
vi.mock('@/features/workflows/canvas/composables/useCanvasNodeGroupTelemetry', () => ({
	useCanvasNodeGroupTelemetry: () => mockGroupTelemetry,
}));

const routerMock = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	resolve: vi.fn().mockReturnValue({ href: '' }),
}));

const routeMock = vi.hoisted(() => ({
	name: undefined as string | undefined,
	params: {},
	query: {} as Record<string, string>,
	// The NDV subtree that the canvas slot renders reads `route.meta`, so the
	// mock has to carry it — a missing `meta` throws while Vue renders.
	meta: {} as Record<string, unknown>,
}));

vi.mock('vue-router', () => ({
	useRouter: () => routerMock,
	useRoute: () => routeMock,
	RouterLink: {
		template: '<a><slot /></a>',
	},
	onBeforeRouteLeave: vi.fn(),
}));

// Route actions open the NDV. The real NDV needs `route.meta` and `<dialog>`
// APIs that this mock and jsdom lack; these tests only assert canvas state.
vi.mock('@/features/ndv/shared/views/NodeDetailsView.vue', () => ({
	__esModule: true,
	default: { name: 'NodeDetailsView', render: () => null },
}));

describe('NodeView', () => {
	const loopReplacementBatch: AddedNodesAndConnections = {
		nodes: [
			{ type: SPLIT_IN_BATCHES_NODE_TYPE, name: 'Loop Over Items' },
			{
				type: NO_OP_NODE_TYPE,
				name: 'Replace Me',
				isAutoAdd: true,
				placeholder: true,
			},
		],
		connections: [
			{ from: { nodeIndex: 0, outputIndex: 1 }, to: { nodeIndex: 1 } },
			{ from: { nodeIndex: 1 }, to: { nodeIndex: 0 } },
		],
	};

	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let ensureNodesAreVisible: ReturnType<typeof vi.fn>;
	let workflowExecutionState: ReturnType<typeof useWorkflowExecutionStateStore>;
	// Node ids the WorkflowCanvas stub emits with `copy:nodes` when its copy button is clicked.
	let copyNodeIds: string[] = [];

	beforeEach(() => {
		copyNodeIds = [];
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.spyOn(usePostHog(), 'isFeatureEnabled').mockReturnValue(true);
		vi.stubGlobal('localStorage', {
			getItem: vi.fn().mockReturnValue(null),
		});
		routeMock.name = undefined;
		routeMock.params = {};
		routeMock.query = {};
		routeMock.meta = {};
		ensureNodesAreVisible = vi.fn();
		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('w0');
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('w0'));
		workflowExecutionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('w0'));
	});

	function renderNodeView() {
		const workflowDocStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowDocumentStore.workflowId),
		);

		return renderComponent(NodeView, {
			global: {
				provide: {
					[WorkflowIdKey as symbol]: computed(() => workflowDocumentStore.workflowId),
					[WorkflowDocumentStoreKey as symbol]: shallowRef(workflowDocStore),
				},
				stubs: {
					// Component stubs avoid loading async subtrees that can outlive the test environment.
					LazyNodeCreation: defineComponent({
						emits: ['addEmptyGroup', 'addNodes', 'toggleNodeCreator', 'close'],
						setup(_, { emit }) {
							return {
								addLoopReplacement: () => emit('addNodes', loopReplacementBatch),
							};
						},
						template: `<>
							<button
								data-test-id="node-creation-stub-add-empty-group"
								@click="$emit('addEmptyGroup', false)"
							/>
							<button
								data-test-id="node-creation-stub-add-empty-groups"
								@click="$emit('addEmptyGroup', false); $emit('addEmptyGroup', false)"
							/>
							<button
								data-test-id="node-creation-stub-add-loop-replacement"
								@click="addLoopReplacement"
							/>
							<button
								data-test-id="node-creation-stub-add-node"
								@click="$emit('addNodes', { nodes: [{ type: '${SET_NODE_TYPE}', name: 'Added' }], connections: [] }); $emit('toggleNodeCreator', { createNodeActive: false, hasAddedNodes: true }); $emit('close')"
							/>
						</>`,
					}),
					LazySetupWorkflowCredentialsButton: { render: () => null },
					WorkflowCanvas: defineComponent({
						emits: ['copy:nodes', 'replace:node', 'viewport:change'],
						setup(_, { emit, expose }) {
							const canvasStore = useCanvasStore();
							expose({ ensureNodesAreVisible });
							return {
								copyNodeIds,
								replaceFirstNode: () => {
									const nodeId = workflowDocStore.allNodes[0]?.id;
									if (nodeId) emit('replace:node', nodeId);
								},
								selectFirstGroup: () => {
									const groupId = workflowDocStore.allGroups[0]?.id;
									if (groupId) canvasStore.setSelectedGroupId(groupId);
								},
							};
						},
						template: `<div>
							<button data-test-id="canvas-stub-copy" @click="$emit('copy:nodes', copyNodeIds)" />
							<button data-test-id="canvas-stub-replace-first" @click="replaceFirstNode" />
							<button data-test-id="canvas-stub-select-first-group" @click="selectFirstGroup" />
							<button
								data-test-id="canvas-stub-set-viewport"
								@click="$emit('viewport:change', { x: 0, y: 0, zoom: 1 }, { width: 1000, height: 1000 })"
							/>
							<slot />
						</div>`,
					}),
				},
			},
		});
	}

	describe('Node group creation and extension', () => {
		function addReplacementNodeTypes() {
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: NO_OP_NODE_TYPE,
					displayName: 'No Operation, do nothing',
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					properties: [
						{
							displayName: 'Empty Group Anchor',
							name: 'emptyGroupAnchor',
							type: 'hidden',
							default: false,
							validateType: undefined,
						},
					],
				}),
				mockNodeTypeDescription({
					name: SPLIT_IN_BATCHES_NODE_TYPE,
					displayName: 'Loop Over Items',
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
				}),
			]);
		}
		it('creates a marked NoOp and its group as one undoable action', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: NO_OP_NODE_TYPE,
					displayName: 'No Operation, do nothing',
					properties: [
						{
							displayName: 'Empty Group Anchor',
							name: 'emptyGroupAnchor',
							type: 'hidden',
							default: false,
							validateType: undefined,
						},
					],
				}),
			]);
			const { findByTestId } = renderNodeView();

			await userEvent.click(await findByTestId('node-creation-stub-add-empty-group'));

			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(1));
			const anchor = workflowDocumentStore.allNodes[0];
			expect(anchor).toMatchObject({
				type: NO_OP_NODE_TYPE,
				name: 'No Operation, do nothing',
				parameters: { emptyGroupAnchor: true },
				placeholder: true,
			});
			expect(workflowDocumentStore.allGroups[0]).toMatchObject({
				name: 'Group 1',
				nodeIds: [anchor.id],
			});
			// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
			expect(mockGroupTelemetry.trackGrouped).toHaveBeenCalledWith(
				workflowDocumentStore.allGroups[0],
				'node-creator',
				'',
			);
			expect(mockGroupTelemetry.trackInitialEmptyGroupConnection).toHaveBeenCalledWith(
				workflowDocumentStore.allGroups[0],
			);

			const historyStore = useHistoryStore();
			expect(historyStore.undoStack).toHaveLength(1);
			const undoable = historyStore.undoStack[0];
			expect(undoable).toBeInstanceOf(BulkCommand);
			if (!(undoable instanceof BulkCommand)) throw new Error('Expected a bulk history action');
			expect(undoable.commands).toHaveLength(2);
			expect(undoable.commands[0]).toBeInstanceOf(AddNodeCommand);
			expect(undoable.commands[1]).toBeInstanceOf(AddNodeGroupCommand);
		});

		it('does not create an empty group when the feature is disabled', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: NO_OP_NODE_TYPE,
					displayName: 'No Operation, do nothing',
					properties: [
						{
							displayName: 'Empty Group Anchor',
							name: 'emptyGroupAnchor',
							type: 'hidden',
							default: false,
							validateType: undefined,
						},
					],
				}),
			]);
			vi.spyOn(usePostHog(), 'isFeatureEnabled').mockReturnValue(false);

			const { findByTestId } = renderNodeView();
			await userEvent.click(await findByTestId('node-creation-stub-add-empty-group'));
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(workflowDocumentStore.allGroups).toHaveLength(0);
			expect(workflowDocumentStore.allNodes).toHaveLength(0);
		});

		it('ignores overlapping empty-group creation requests', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: NO_OP_NODE_TYPE,
					displayName: 'No Operation, do nothing',
					properties: [
						{
							displayName: 'Empty Group Anchor',
							name: 'emptyGroupAnchor',
							type: 'hidden',
							default: false,
							validateType: undefined,
						},
					],
				}),
			]);
			const { findByTestId } = renderNodeView();

			await userEvent.click(await findByTestId('node-creation-stub-add-empty-groups'));

			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(1));
			expect(workflowDocumentStore.allNodes).toHaveLength(1);
			expect(useHistoryStore().undoStack).toHaveLength(1);
		});

		it('centers the first empty group and collision-adjusts later groups', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: NO_OP_NODE_TYPE,
					displayName: 'No Operation, do nothing',
					properties: [],
				}),
			]);
			const { findByTestId } = renderNodeView();
			await userEvent.click(await findByTestId('canvas-stub-set-viewport'));
			const addEmptyGroup = await findByTestId('node-creation-stub-add-empty-group');

			await userEvent.click(addEmptyGroup);
			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(1));
			const firstPosition = workflowDocumentStore.allNodes[0].position;
			expect(firstPosition).toEqual(
				snapPositionToGrid([500 - DEFAULT_NODE_SIZE[0] / 2, 500 - DEFAULT_NODE_SIZE[1] / 2]),
			);

			await userEvent.click(addEmptyGroup);
			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(2));

			expect(workflowDocumentStore.allNodes[1].position).not.toEqual(firstPosition);
		});

		it('connects a new empty group to the selected empty group', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: NO_OP_NODE_TYPE,
					displayName: 'No Operation, do nothing',
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					properties: [
						{
							displayName: 'Empty Group Anchor',
							name: 'emptyGroupAnchor',
							type: 'hidden',
							default: false,
							validateType: undefined,
						},
					],
				}),
			]);
			const { findByTestId } = renderNodeView();
			await userEvent.click(await findByTestId('canvas-stub-set-viewport'));
			const addEmptyGroup = await findByTestId('node-creation-stub-add-empty-group');

			await userEvent.click(addEmptyGroup);
			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(1));
			const firstAnchor = workflowDocumentStore.allNodes[0];
			expect(isEmptyGroupAnchor(firstAnchor)).toBe(true);
			expect(workflowDocumentStore.allGroups[0].nodeIds).toEqual([firstAnchor.id]);
			await userEvent.click(await findByTestId('canvas-stub-select-first-group'));

			await userEvent.click(addEmptyGroup);
			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(2));
			const secondGroup = workflowDocumentStore.allGroups[1];
			const secondAnchor = workflowDocumentStore.allNodes[1];

			expect(secondGroup.nodeIds).toEqual([secondAnchor.id]);
			expect(secondAnchor.position[0]).toBeGreaterThan(firstAnchor.position[0]);
			expect(workflowDocumentStore.connectionsBySourceNode).toMatchObject({
				[firstAnchor.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: secondAnchor.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			});

			const historyStore = useHistoryStore();
			expect(historyStore.undoStack).toHaveLength(2);
			const secondGroupAction = historyStore.undoStack[1];
			expect(secondGroupAction).toBeInstanceOf(BulkCommand);
			if (!(secondGroupAction instanceof BulkCommand)) {
				throw new Error('Expected a bulk history action');
			}
			expect(secondGroupAction.commands).toEqual([
				expect.any(AddNodeCommand),
				expect.any(AddConnectionCommand),
				expect.any(AddNodeGroupCommand),
			]);
		});

		it('adds a node to a regular group through the output plus', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: SET_NODE_TYPE,
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
				}),
			]);
			const { findByTestId } = renderNodeView();
			const source = createTestNode({
				id: 'source',
				name: 'Source',
				type: SET_NODE_TYPE,
				position: [0, 0],
			});
			workflowDocumentStore.addNode(source);
			const group = workflowDocumentStore.createGroup([source.id], 'Group 1');

			useNodeCreatorStore().openNodeCreatorForConnectingNode({
				workflowId: workflowDocumentStore.workflowId,
				connection: {
					source: source.id,
					sourceHandle: `outputs/${NodeConnectionTypes.Main}/0`,
				},
				eventSource: NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
			});
			await userEvent.click(await findByTestId('node-creation-stub-add-node'));

			await waitFor(() =>
				expect(workflowDocumentStore.getGroupById(group.id)?.nodeIds).toHaveLength(2),
			);
			const addedNode = workflowDocumentStore.allNodes.find(({ id }) => id !== source.id);
			expect(addedNode).toBeDefined();
			expect(workflowDocumentStore.getGroupById(group.id)?.nodeIds).toContain(addedNode?.id);
		});

		it('does not extend a group from stale selection state when the general creator is used', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: SET_NODE_TYPE,
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
				}),
			]);
			const { findByTestId } = renderNodeView();
			const source = createTestNode({
				id: 'source',
				name: 'Source',
				type: SET_NODE_TYPE,
				position: [0, 0],
			});
			workflowDocumentStore.addNode(source);
			const group = workflowDocumentStore.createGroup([source.id], 'Group 1');
			const uiStore = useUIStore();
			uiStore.lastInteractedWithNodeId = source.id;
			uiStore.lastInteractedWithNodeHandle = `outputs/${NodeConnectionTypes.Main}/0`;
			useNodeCreatorStore().setNodeCreatorState({
				workflowId: workflowDocumentStore.workflowId,
				createNodeActive: true,
				source: NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			});

			await userEvent.click(await findByTestId('node-creation-stub-add-node'));

			await waitFor(() => expect(workflowDocumentStore.allNodes).toHaveLength(2));
			expect(workflowDocumentStore.getGroupById(group.id)?.nodeIds).toEqual([source.id]);
		});

		it('adds a node to a loaded group through its outgoing edge action', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: SET_NODE_TYPE,
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
				}),
			]);
			const { findByTestId } = renderNodeView();
			const source = createTestNode({
				id: 'source',
				name: 'Source',
				type: SET_NODE_TYPE,
				position: [0, 0],
			});
			const target = createTestNode({
				id: 'target',
				name: 'Target',
				type: SET_NODE_TYPE,
				position: [500, 0],
			});
			workflowDocumentStore.setNodes([source, target]);
			workflowDocumentStore.setConnections({
				[source.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: target.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			});
			workflowDocumentStore.setNodeGroups([
				{ id: 'loaded-group', name: 'Loaded group', nodeIds: [source.id] },
			]);

			useNodeCreatorStore().openNodeCreatorForConnectingNode({
				workflowId: workflowDocumentStore.workflowId,
				connection: {
					source: source.id,
					sourceHandle: `outputs/${NodeConnectionTypes.Main}/0`,
					target: target.id,
					targetHandle: `inputs/${NodeConnectionTypes.Main}/0`,
				},
				eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
			});
			await userEvent.click(await findByTestId('node-creation-stub-add-node'));

			await waitFor(() =>
				expect(workflowDocumentStore.getGroupById('loaded-group')?.nodeIds).toHaveLength(2),
			);
			const addedNode = workflowDocumentStore.getNodeByName('Added');
			expect(addedNode).toBeDefined();
			expect(workflowDocumentStore.getGroupById('loaded-group')?.nodeIds).toContain(addedNode?.id);
			expect(workflowDocumentStore.connectionsBySourceNode).toMatchObject({
				[source.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: addedNode?.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				[addedNode?.name ?? '']: {
					[NodeConnectionTypes.Main]: [
						[{ node: target.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			});
		});

		it('replaces the empty-group anchor and restores it with undo', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: NO_OP_NODE_TYPE,
					displayName: 'No Operation, do nothing',
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					properties: [
						{
							displayName: 'Empty Group Anchor',
							name: 'emptyGroupAnchor',
							type: 'hidden',
							default: false,
							validateType: undefined,
						},
					],
				}),
				mockNodeTypeDescription({
					name: SET_NODE_TYPE,
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
				}),
			]);
			const { findByTestId } = renderNodeView();

			await userEvent.click(await findByTestId('node-creation-stub-add-empty-group'));
			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(1));
			const group = workflowDocumentStore.allGroups[0];
			const anchor = workflowDocumentStore.allNodes[0];

			useNodeCreatorStore().openNodeCreatorForConnectingNode({
				workflowId: workflowDocumentStore.workflowId,
				connection: {
					source: anchor.id,
					sourceHandle: `outputs/${NodeConnectionTypes.Main}/0`,
				},
				eventSource: NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
			});
			await userEvent.click(await findByTestId('node-creation-stub-add-node'));

			await waitFor(() => expect(workflowDocumentStore.allNodes[0]?.id).not.toBe(anchor.id));
			expect(workflowDocumentStore.allNodes).toHaveLength(1);
			const addedNode = workflowDocumentStore.allNodes[0];
			expect(addedNode.id).not.toBe(anchor.id);
			expect(isEmptyGroupAnchor(addedNode)).toBe(false);
			expect(workflowDocumentStore.getGroupById(group.id)?.nodeIds).toEqual([addedNode.id]);

			const historyStore = useHistoryStore();
			expect(historyStore.undoStack).toHaveLength(2);
			const transition = historyStore.undoStack[1];
			expect(transition).toBeInstanceOf(BulkCommand);
			if (!(transition instanceof BulkCommand)) throw new Error('Expected a bulk history action');

			const redoCommands = [];
			for (let index = transition.commands.length - 1; index >= 0; index--) {
				const command = transition.commands[index];
				await command.revert();
				redoCommands.push(command.getReverseCommand(Date.now()));
			}

			await waitFor(() => expect(workflowDocumentStore.allNodes).toEqual([anchor]));
			expect(workflowDocumentStore.getGroupById(group.id)?.nodeIds).toEqual([anchor.id]);

			for (let index = redoCommands.length - 1; index >= 0; index--) {
				await redoCommands[index].revert();
			}

			await waitFor(() => expect(workflowDocumentStore.allNodes).toEqual([addedNode]));
			expect(workflowDocumentStore.getGroupById(group.id)?.nodeIds).toEqual([addedNode.id]);
		});

		it('replaces the empty-group anchor with the selected batch and restores it on undo', async () => {
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			addReplacementNodeTypes();
			const { findByTestId } = renderNodeView();

			await userEvent.click(await findByTestId('node-creation-stub-add-empty-group'));
			await waitFor(() => expect(workflowDocumentStore.allGroups).toHaveLength(1));
			const anchorId = workflowDocumentStore.allNodes[0].id;

			await userEvent.click(await findByTestId('canvas-stub-replace-first'));
			await userEvent.click(await findByTestId('node-creation-stub-add-loop-replacement'));

			await waitFor(() => expect(workflowDocumentStore.allNodes).toHaveLength(2));
			expect(workflowDocumentStore.getNodeById(anchorId)).toBeUndefined();
			expect(workflowDocumentStore.allGroups[0].nodeIds).toEqual(
				workflowDocumentStore.allNodes.map((node) => node.id),
			);
			expect(workflowDocumentStore.allNodes.map((node) => node.name)).toEqual([
				'Loop Over Items',
				'Replace Me',
			]);

			const historyStore = useHistoryStore();
			expect(historyStore.undoStack).toHaveLength(2);
			const replacementUndo = historyStore.popUndoableToUndo();
			expect(replacementUndo).toBeInstanceOf(BulkCommand);
			if (!(replacementUndo instanceof BulkCommand)) {
				throw new Error('Expected a bulk history action');
			}

			historyStore.bulkInProgress = true;
			for (let index = replacementUndo.commands.length - 1; index >= 0; index--) {
				await replacementUndo.commands[index].revert();
			}
			await nextTick();
			historyStore.bulkInProgress = false;

			await waitFor(() => expect(workflowDocumentStore.allNodes).toHaveLength(1));
			expect(workflowDocumentStore.allNodes[0].id).toBe(anchorId);
			expect(workflowDocumentStore.allGroups[0].nodeIds).toEqual([anchorId]);
		});
	});

	describe('Trigger node selection', () => {
		const n0 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n0' });
		const n1 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n1' });
		const n2 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n2' });

		beforeEach(() => {
			workflowDocumentStore.setNodes([n0, n1]);

			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: MANUAL_TRIGGER_NODE_TYPE,
					group: ['trigger'],
				}),
			]);
		});

		it('should select newly added trigger node automatically', async () => {
			renderNodeView();
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n0'));
			workflowDocumentStore.addNode(n2);
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n2'));
		});

		it('should re-select a trigger when selected trigger gets disabled or removed', async () => {
			renderNodeView();
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n0'));
			useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowDocumentStore.workflowId),
			).removeNode(n0);
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n1'));
			useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowDocumentStore.workflowId),
			).setNodeValue({
				name: 'n1',
				key: 'disabled',
				value: true,
			});
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe(undefined));
		});
	});

	describe('Evaluation trigger route action', () => {
		beforeEach(() => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: EVALUATION_TRIGGER_NODE_TYPE,
					group: ['trigger'],
				}),
			]);
		});

		it('should add the evaluation trigger node and show it on the canvas', async () => {
			routeMock.query = { action: 'addEvaluationTrigger' };

			renderNodeView();

			await waitFor(() => {
				const evaluationTrigger = workflowDocumentStore.allNodes.find(
					(node) => node.type === EVALUATION_TRIGGER_NODE_TYPE,
				);

				expect(evaluationTrigger).toBeDefined();
				expect(ensureNodesAreVisible).toHaveBeenCalledWith([evaluationTrigger?.id]);
			});

			expect(routerMock.replace).toHaveBeenCalledWith({
				query: { action: undefined },
			});
		});

		it('should open the existing evaluation trigger instead of adding another one', async () => {
			const existingEvaluationTrigger = createTestNode({
				type: EVALUATION_TRIGGER_NODE_TYPE,
				name: 'Evaluation',
			});
			workflowDocumentStore.setNodes([existingEvaluationTrigger]);
			routeMock.query = { action: 'addEvaluationTrigger' };

			renderNodeView();

			await waitFor(() => {
				expect(ensureNodesAreVisible).toHaveBeenCalledWith([existingEvaluationTrigger.id]);
			});

			expect(
				workflowDocumentStore.allNodes.filter((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE),
			).toHaveLength(1);
		});
	});

	describe('Protected instance', () => {
		beforeEach(() => {
			workflowDocumentStore.setNodes([
				createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n0' }),
			]);
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({
					name: MANUAL_TRIGGER_NODE_TYPE,
					group: ['trigger'],
				}),
			]);
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({
					id: 'w0',
					scopes: ['workflow:execute', 'workflow:read'],
				}),
			);
		});

		it('hides the execute workflow button when the instance is read-only', async () => {
			useSourceControlStore().preferences.branchReadOnly = true;

			const { queryByTestId, findByText } = renderNodeView();

			await findByText(
				"This workflow can't be edited or run manually because it's on a protected instance",
			);
			expect(queryByTestId('execute-workflow-button')).not.toBeInTheDocument();
		});

		it('shows the execute workflow button when the instance is writable', async () => {
			useSourceControlStore().preferences.branchReadOnly = false;

			const { findByTestId } = renderNodeView();

			expect(await findByTestId('execute-workflow-button')).toBeInTheDocument();
		});

		it('hides the execute workflow button in an executable preview when the instance is read-only', async () => {
			routeMock.name = VIEWS.DEMO;
			routeMock.query = { canExecute: 'true' };
			useSourceControlStore().preferences.branchReadOnly = true;

			const { queryByTestId, findByText } = renderNodeView();

			await findByText(
				"This workflow can't be edited or run manually because it's on a protected instance",
			);
			expect(queryByTestId('execute-workflow-button')).not.toBeInTheDocument();
		});

		it('shows the execute workflow button in an executable preview when the instance is writable', async () => {
			routeMock.name = VIEWS.DEMO;
			routeMock.query = { canExecute: 'true' };
			useSourceControlStore().preferences.branchReadOnly = false;

			const { findByTestId } = renderNodeView();

			expect(await findByTestId('execute-workflow-button')).toBeInTheDocument();
		});
	});

	describe('Type availability policies', () => {
		let fetchForProject: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			fetchForProject = vi
				.spyOn(useTypeAvailabilityPoliciesStore(), 'fetchForProject')
				.mockResolvedValue(undefined);
		});

		it('loads the policies of the resolved project on mount', async () => {
			useProjectsStore().personalProject = { id: 'personal', name: 'Personal' } as Project;

			renderNodeView();

			await waitFor(() => expect(fetchForProject).toHaveBeenCalledWith('personal'));
		});

		it('loads the policies again when the resolved project changes', async () => {
			useProjectsStore().personalProject = { id: 'personal', name: 'Personal' } as Project;
			renderNodeView();
			await waitFor(() => expect(fetchForProject).toHaveBeenCalledWith('personal'));

			useProjectsStore().setCurrentProject({ id: 'team', name: 'Team' } as Project);

			await waitFor(() => expect(fetchForProject).toHaveBeenCalledWith('team'));
		});

		it('does not load policies without a project', async () => {
			renderNodeView();

			await waitFor(() => expect(fetchForProject).not.toHaveBeenCalled());
		});
	});

	describe('Import / Export', () => {
		const imported = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'Imported' });

		const workflowData = { nodes: [imported], connections: {} };
		let deferred: (() => void | Promise<void>) | undefined;

		beforeEach(() => {
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({ name: MANUAL_TRIGGER_NODE_TYPE, group: ['trigger'] }),
			]);
			// The nudge is "shown": the gate captures the action instead of running it.
			deferred = undefined;
			mockMcpJsonNudgeGate.mockReset().mockImplementation(async (_surface, action) => {
				deferred = action;
			});
			// fetchWorkflowDataFromUrl needs a project and the URL fetch stubbed.
			useProjectsStore().personalProject = { id: 'personal', name: 'Personal' } as Project;
			vi.spyOn(workflowsStore, 'getWorkflowFromUrl').mockResolvedValue(workflowData as never);
		});

		// The AI builder's version restore emits the same event, so the nudge must not sit
		// here. The file-import gate lives at the emitter in ActionsDropdownMenu instead.
		it('lands imported nodes without gating the importWorkflowData event behind the MCP nudge', async () => {
			renderNodeView();

			nodeViewEventBus.emit('importWorkflowData', { data: workflowData });

			await waitFor(() =>
				expect(workflowDocumentStore.allNodes.map((node) => node.name)).toEqual(['Imported']),
			);
			expect(mockMcpJsonNudgeGate).not.toHaveBeenCalled();
		});

		it('holds a URL import behind the import_url nudge and lands the nodes when it continues', async () => {
			renderNodeView();

			nodeViewEventBus.emit('importWorkflowUrl', { url: 'https://example.com/workflow.json' });

			await waitFor(() =>
				expect(mockMcpJsonNudgeGate).toHaveBeenCalledWith('import_url', expect.any(Function)),
			);
			expect(workflowDocumentStore.allNodes).toHaveLength(0);

			await deferred?.();

			await waitFor(() =>
				expect(workflowDocumentStore.allNodes.map((node) => node.name)).toEqual(['Imported']),
			);
		});

		// The modal lives at the app root and outlives this view. If the user navigates away
		// while it is open, continuing must not import into whatever workflow is now shown.
		it('drops a deferred URL import once NodeView has unmounted', async () => {
			const { unmount } = renderNodeView();

			nodeViewEventBus.emit('importWorkflowUrl', { url: 'https://example.com/workflow.json' });

			await waitFor(() =>
				expect(mockMcpJsonNudgeGate).toHaveBeenCalledWith('import_url', expect.any(Function)),
			);
			unmount();

			await deferred?.();

			expect(workflowDocumentStore.allNodes).toHaveLength(0);
		});
	});

	describe('Copy / Paste', () => {
		const existing = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'Existing' });
		const pasted = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'Pasted' });
		const pastedJson = JSON.stringify({ nodes: [pasted], connections: {} });

		let deferred: (() => void | Promise<void>) | undefined;
		// jsdom has no clipboard API. With `navigator.clipboard` present but no write
		// permission, vueuse falls back to a textarea + execCommand('copy'), which we capture.
		let copiedText: string[] = [];

		function pasteText(text: string) {
			const event = new Event('paste');
			Object.assign(event, { clipboardData: { getData: () => text } });
			document.dispatchEvent(event);
		}

		beforeEach(() => {
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({ name: MANUAL_TRIGGER_NODE_TYPE, group: ['trigger'] }),
			]);
			// Paste only runs on the workflow tab of a writable canvas.
			routeMock.meta = { nodeView: true };
			useWorkflowsListStore().addWorkflow(
				createTestWorkflow({ id: 'w0', scopes: ['workflow:read', 'workflow:update'] }),
			);
			workflowDocumentStore.setNodes([existing]);
			copyNodeIds = [existing.id];

			deferred = undefined;
			mockMcpJsonNudgeGate.mockReset().mockImplementation(async (_surface, action) => {
				deferred = action;
			});

			copiedText = [];
			Object.defineProperty(window.navigator, 'clipboard', { value: {}, configurable: true });
			document.execCommand = vi.fn(() => {
				const textarea = document.body.lastElementChild;
				if (textarea instanceof HTMLTextAreaElement) copiedText.push(textarea.value);
				return true;
			});
		});

		afterEach(() => {
			Reflect.deleteProperty(window.navigator, 'clipboard');
		});

		it('holds a copy behind the copy nudge and writes to the clipboard when it continues', async () => {
			const { findByTestId } = renderNodeView();

			await userEvent.click(await findByTestId('canvas-stub-copy'));

			await waitFor(() =>
				expect(mockMcpJsonNudgeGate).toHaveBeenCalledWith('copy', expect.any(Function)),
			);
			expect(copiedText).toEqual([]);

			await deferred?.();

			expect(copiedText).toHaveLength(1);
			expect(copiedText[0]).toContain('"name": "Existing"');
		});

		it('drops a deferred copy once NodeView has unmounted', async () => {
			const { findByTestId, unmount } = renderNodeView();

			await userEvent.click(await findByTestId('canvas-stub-copy'));

			await waitFor(() =>
				expect(mockMcpJsonNudgeGate).toHaveBeenCalledWith('copy', expect.any(Function)),
			);
			unmount();

			await deferred?.();

			expect(copiedText).toEqual([]);
		});

		it('holds a paste behind the paste nudge and lands the nodes when it continues', async () => {
			renderNodeView();

			pasteText(pastedJson);

			await waitFor(() =>
				expect(mockMcpJsonNudgeGate).toHaveBeenCalledWith('paste', expect.any(Function)),
			);
			expect(workflowDocumentStore.allNodes.map((node) => node.name)).toEqual(['Existing']);

			await deferred?.();

			await waitFor(() =>
				expect(workflowDocumentStore.allNodes.map((node) => node.name)).toEqual([
					'Existing',
					'Pasted',
				]),
			);
		});

		it('does not open the paste nudge for clipboard text that is not workflow JSON', async () => {
			renderNodeView();

			pasteText('just some text');

			// Give the async paste handler a tick to settle before asserting nothing happened.
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockMcpJsonNudgeGate).not.toHaveBeenCalled();
			expect(workflowDocumentStore.allNodes.map((node) => node.name)).toEqual(['Existing']);
		});

		it('drops a deferred paste once NodeView has unmounted', async () => {
			const { unmount } = renderNodeView();

			pasteText(pastedJson);

			await waitFor(() =>
				expect(mockMcpJsonNudgeGate).toHaveBeenCalledWith('paste', expect.any(Function)),
			);
			unmount();

			await deferred?.();

			expect(workflowDocumentStore.allNodes.map((node) => node.name)).toEqual(['Existing']);
		});
	});
});
