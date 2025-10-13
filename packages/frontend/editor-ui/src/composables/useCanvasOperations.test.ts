import { setActivePinia } from 'pinia';
import type {
	IConnection,
	INodeTypeDescription,
	IWebhookDescription,
	Workflow,
	INodeConnections,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, UserError } from 'n8n-workflow';
import type { CanvasConnection, CanvasNode } from '@/features/canvas/canvas.types';
import { CanvasConnectionMode } from '@/features/canvas/canvas.types';
import type {
	ICredentialsResponse,
	IExecutionResponse,
	INodeUi,
	IWorkflowDb,
	WorkflowDataWithTemplateId,
} from '@/Interface';
import type { IWorkflowTemplate, IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import { RemoveNodeCommand, ReplaceNodeParametersCommand } from '@/models/history';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { useNDVStore } from '@/stores/ndv.store';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowObject,
	mockNode,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { mock } from 'vitest-mock-extended';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import {
	AGENT_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	STICKY_NODE_TYPE,
	VIEWS,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type { Connection } from '@vue-flow/core';
import { useClipboard } from '@/composables/useClipboard';
import { createCanvasConnectionHandleString } from '@/features/canvas/canvas.utils';
import { nextTick, reactive, ref } from 'vue';
import type { CanvasLayoutEvent } from '@/features/canvas/composables/useCanvasLayout';
import { useTelemetry } from './useTelemetry';
import { useToast } from '@/composables/useToast';
import * as nodeHelpers from '@/composables/useNodeHelpers';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/composables/useWorkflowState';

import { TelemetryHelpers } from 'n8n-workflow';
import { useRouter } from 'vue-router';
import { useTemplatesStore } from '@/features/templates/templates.store';

const mockRoute = reactive({
	query: {},
});

const mockRouterReplace = vi.fn();

vi.mock('vue-router', () => ({
	useRoute: () => mockRoute,
	useRouter: () => ({
		replace: mockRouterReplace,
	}),
}));

import { useCanvasOperations } from '@/composables/useCanvasOperations';

vi.mock('n8n-workflow', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('n8n-workflow')>();
	return {
		...actual,
		TelemetryHelpers: {
			...actual.TelemetryHelpers,
			generateNodesGraph: vi.fn().mockReturnValue({
				nodeGraph: {
					nodes: [],
				},
			}),
		},
	};
});

vi.mock('@/composables/useClipboard', async () => {
	const copySpy = vi.fn();
	return { useClipboard: vi.fn(() => ({ copy: copySpy })) };
});

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({ track }),
	};
});

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	const showToast = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
				showToast,
			};
		},
	};
});

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

describe('useCanvasOperations', () => {
	const workflowId = 'test';
	const initialState = {
		[STORES.NODE_TYPES]: {},
		[STORES.NDV]: {},
		[STORES.WORKFLOWS]: {
			workflowId,
			workflow: mock<IWorkflowDb>({
				id: workflowId,
				nodes: [],
				connections: {},
				tags: [],
				usedCredentials: [],
			}),
		},
		[STORES.SETTINGS]: {
			settings: {
				enterprise: {},
			},
		},
	};

	let workflowState: WorkflowState;

	beforeEach(() => {
		vi.clearAllMocks();

		const pinia = createTestingPinia({ initialState });
		setActivePinia(pinia);

		workflowState = useWorkflowState();
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);
	});

	describe('requireNodeTypeDescription', () => {
		it('should return node type description when type and version match', () => {
			const nodeTypesStore = useNodeTypesStore();
			const type = 'testType';
			const version = 1;
			const expectedDescription = mockNodeTypeDescription({ name: type, version });

			nodeTypesStore.nodeTypes = { [type]: { [version]: expectedDescription } };

			const { requireNodeTypeDescription } = useCanvasOperations();
			const result = requireNodeTypeDescription(type, version);

			expect(result).toBe(expectedDescription);
		});

		it('should return node type description when only type is provided and it exists', () => {
			const nodeTypesStore = useNodeTypesStore();
			const type = 'testTypeWithoutVersion';
			const expectedDescription = mockNodeTypeDescription({ name: type });

			nodeTypesStore.nodeTypes = { [type]: { 2: expectedDescription } };

			const { requireNodeTypeDescription } = useCanvasOperations();
			const result = requireNodeTypeDescription(type);

			expect(result).toBe(expectedDescription);
		});

		it("should return placeholder node type description if node type doesn't exist", () => {
			const type = 'nonexistentType';

			const { requireNodeTypeDescription } = useCanvasOperations();
			const result = requireNodeTypeDescription(type);

			expect(result).toEqual({
				name: type,
				displayName: type,
				description: '',
				defaults: {},
				group: [],
				inputs: [],
				outputs: [],
				properties: [],
				version: 1,
			});
		});
	});

	describe('addNode', () => {
		it('should create node with default version when version is undefined', () => {
			const { addNode } = useCanvasOperations();
			const result = addNode(
				{
					name: 'example',
					type: 'type',
					typeVersion: 1,
				},
				mockNodeTypeDescription({ name: 'type' }),
			);

			expect(result.typeVersion).toBe(1);
		});

		it('should create node with default position when position is not provided', () => {
			const { addNode } = useCanvasOperations();
			const result = addNode(
				{
					type: 'type',
					typeVersion: 1,
				},
				mockNodeTypeDescription({ name: 'type' }),
			);

			expect(result.position).toEqual([0, 0]); // Default last click position
		});

		it('should create node with provided position when position is provided', () => {
			const { addNode } = useCanvasOperations();
			const result = addNode(
				{
					type: 'type',
					typeVersion: 1,
					position: [32, 32],
				},
				mockNodeTypeDescription({ name: 'type' }),
			);

			expect(result.position).toEqual([32, 32]);
		});

		it('should not assign credentials when multiple credentials are available', () => {
			const credentialsStore = useCredentialsStore();
			const credentialA = mock<ICredentialsResponse>({ id: '1', name: 'credA', type: 'cred' });
			const credentialB = mock<ICredentialsResponse>({ id: '1', name: 'credB', type: 'cred' });
			const nodeTypeName = 'type';
			const nodeTypeDescription = mockNodeTypeDescription({
				name: nodeTypeName,
				credentials: [{ name: credentialA.name }, { name: credentialB.name }],
			});

			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getUsableCredentialByType', 'get').mockReturnValue(() => [
				credentialA,
				credentialB,
			]);

			const { addNode } = useCanvasOperations();
			const result = addNode(
				{
					type: 'type',
					typeVersion: 1,
				},
				nodeTypeDescription,
			);
			expect(result.credentials).toBeUndefined();
		});

		it('should open NDV when specified', async () => {
			const ndvStore = useNDVStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: 'type' });

			const { addNode } = useCanvasOperations();
			addNode(
				{
					type: 'type',
					typeVersion: 1,
					name: 'Test Name',
				},
				nodeTypeDescription,
				{ openNDV: true },
			);

			await waitFor(() =>
				expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith('Test Name', 'added_new_node'),
			);
		});

		it('should not set sticky node type as active node', async () => {
			const ndvStore = useNDVStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: STICKY_NODE_TYPE });

			const { addNode } = useCanvasOperations();
			addNode(
				{
					type: STICKY_NODE_TYPE,
					typeVersion: 1,
					name: 'Test Name',
				},
				nodeTypeDescription,
				{ openNDV: true },
			);

			await waitFor(() => expect(ndvStore.setActiveNodeName).not.toHaveBeenCalled());
		});

		it('should pass actionName to telemetry when adding node with action', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeCreatorStore = mockedStore(useNodeCreatorStore);
			const nodeTypeDescription = mockNodeTypeDescription({ name: 'hubspot' });
			const actionName = 'Create Contact';

			workflowsStore.addNode = vi.fn();
			nodeCreatorStore.onNodeAddedToCanvas = vi.fn();

			const { addNode } = useCanvasOperations();
			addNode(
				{
					type: 'hubspot',
					typeVersion: 1,
				},
				nodeTypeDescription,
				{
					telemetry: true,
					actionName,
				},
			);

			await waitFor(() => {
				expect(nodeCreatorStore.onNodeAddedToCanvas).toHaveBeenCalledWith(
					expect.objectContaining({
						action: actionName,
						node_type: 'hubspot',
					}),
				);
			});
		});
	});

	describe('resolveNodePosition', () => {
		it('should return the node position if it is already set', () => {
			const node = createTestNode({ position: [112, 112] });
			const nodeTypeDescription = mockNodeTypeDescription();

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition(node, nodeTypeDescription);

			expect(position).toEqual([112, 112]);
		});

		it('should place the node at the last cancelled connection position', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			vi.spyOn(uiStore, 'lastInteractedWithNode', 'get').mockReturnValue(node);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNodeHandle = 'inputs/main/0';
			uiStore.lastCancelledConnectionPosition = [200, 200];

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([208, 160]);
			expect(uiStore.lastCancelledConnectionPosition).toBeUndefined();
		});

		it('should place the node to the right of the last interacted with node', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [112, 112],
				type: 'test',
				typeVersion: 1,
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([320, 112]);
		});

		it('should place the node below the last interacted with node if it has non-main outputs', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [96, 96],
				type: 'test',
				typeVersion: 1,
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiTool },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([NodeConnectionTypes.AiTool])
				.mockReturnValueOnce([NodeConnectionTypes.AiTool]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([448, 96]);
		});

		it('should place the node at the last clicked position if no other position is set', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			workflowsStore.workflowTriggerNodes = [createTestNode({ id: 'trigger', position: [96, 96] })];

			const { resolveNodePosition, lastClickPosition } = useCanvasOperations();
			lastClickPosition.value = [300, 300];

			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([304, 304]); // Snapped to grid
		});

		it('should place the trigger node at the root if it is the first trigger node', () => {
			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([0, 0]);
		});

		it('should apply custom Y offset for AI Language Model connection type', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [100, 100],
				type: 'test',
				typeVersion: 1,
			});
			uiStore.lastInteractedWithNodeHandle = `outputs/${NodeConnectionTypes.AiLanguageModel}/0`;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiLanguageModel },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiLanguageModel]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			// Configuration node size is [200, 80], so customOffset = 200 * 2 = 400
			// Expected position: [100 + (200/1) * 1 - 200/2 - 400, 100 + 220] = [-200, 320]
			expect(position[0]).toBeLessThan(100); // Node should be moved left due to custom offset
			expect(position[1]).toEqual(320); // Standard Y position for configuration nodes
		});

		it('should apply custom Y offset for AI Memory connection type', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [100, 100],
				type: 'test',
				typeVersion: 1,
			});
			uiStore.lastInteractedWithNodeHandle = `outputs/${NodeConnectionTypes.AiMemory}/0`;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiMemory },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiMemory]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position[0]).toBeLessThan(100); // Node should be moved left due to custom offset
			expect(position[1]).toEqual(320); // Standard Y position for configuration nodes
		});

		it('should not apply custom offset for regular connection types', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [100, 100],
				type: 'test',
				typeVersion: 1,
			});
			uiStore.lastInteractedWithNodeHandle = `outputs/${NodeConnectionTypes.AiTool}/0`;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiTool },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiTool]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			// No custom offset applied, allowing for some wiggle room when tests are run on different environments
			expect(position[0]).toBeGreaterThanOrEqual(40);
			expect(position[0]).toBeLessThanOrEqual(80);
			expect(position[1]).toBe(320);
		});

		it('should handle missing connection type gracefully', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [100, 100],
				type: 'test',
				typeVersion: 1,
			});
			// No lastInteractedWithNodeHandle set
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiTool },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiTool]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			// No custom offset applied, allowing for some wiggle room when tests are run on different environments
			expect(position[0]).toBeGreaterThanOrEqual(40);
			expect(position[0]).toBeLessThanOrEqual(80);
			expect(position[1]).toBe(320);
		});
	});

	describe('updateNodesPosition', () => {
		it('records history for multiple node position updates when tracking is enabled', () => {
			const historyStore = useHistoryStore();
			const events = [
				{ id: 'node1', position: { x: 96, y: 96 } },
				{ id: 'node2', position: { x: 208, y: 208 } },
			];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { updateNodesPosition } = useCanvasOperations();
			updateNodesPosition(events, { trackHistory: true, trackBulk: true });

			expect(startRecordingUndoSpy).toHaveBeenCalled();
			expect(stopRecordingUndoSpy).toHaveBeenCalled();
		});

		it('updates positions for multiple nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const events = [
				{ id: 'node1', position: { x: 96, y: 96 } },
				{ id: 'node2', position: { x: 208, y: 208 } },
			];
			const setNodePositionByIdSpy = vi.spyOn(workflowState, 'setNodePositionById');
			workflowsStore.getNodeById
				.mockReturnValueOnce(
					createTestNode({
						id: events[0].id,
						position: [events[0].position.x, events[0].position.y],
					}),
				)
				.mockReturnValueOnce(
					createTestNode({
						id: events[1].id,
						position: [events[1].position.x, events[1].position.y],
					}),
				);

			const { updateNodesPosition } = useCanvasOperations();
			updateNodesPosition(events);

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node1', [96, 96]);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node2', [208, 208]);
		});

		it('does not record history when trackHistory is false', () => {
			const historyStore = useHistoryStore();
			const events = [{ id: 'node1', position: { x: 96, y: 96 } }];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { updateNodesPosition } = useCanvasOperations();
			updateNodesPosition(events, { trackHistory: false, trackBulk: false });

			expect(startRecordingUndoSpy).not.toHaveBeenCalled();
			expect(stopRecordingUndoSpy).not.toHaveBeenCalled();
		});
	});

	describe('tidyUp', () => {
		it('records history for multiple node position updates', () => {
			const historyStore = useHistoryStore();
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { tidyUp } = useCanvasOperations();
			tidyUp(event);

			expect(startRecordingUndoSpy).toHaveBeenCalled();
			expect(stopRecordingUndoSpy).toHaveBeenCalled();
		});

		it('updates positions for multiple nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};
			const setNodePositionByIdSpy = vi.spyOn(workflowState, 'setNodePositionById');
			workflowsStore.getNodeById
				.mockReturnValueOnce(
					createTestNode({
						id: event.result.nodes[0].id,
						position: [event.result.nodes[0].x, event.result.nodes[0].y],
					}),
				)
				.mockReturnValueOnce(
					createTestNode({
						id: event.result.nodes[1].id,
						position: [event.result.nodes[1].x, event.result.nodes[1].y],
					}),
				);

			const { tidyUp } = useCanvasOperations();
			tidyUp(event);

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node1', [96, 96]);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node2', [208, 208]);
		});

		it('should send a "User tidied up workflow" telemetry event', () => {
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};

			const { tidyUp } = useCanvasOperations();
			tidyUp(event);

			expect(useTelemetry().track).toHaveBeenCalledWith('User tidied up canvas', {
				nodes_count: 2,
				source: 'canvas-button',
				target: 'all',
			});
		});

		it('should send telemetry event when trackEvents is true', () => {
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};

			const { tidyUp } = useCanvasOperations();
			tidyUp(event, { trackEvents: true });

			expect(useTelemetry().track).toHaveBeenCalledWith('User tidied up canvas', {
				nodes_count: 2,
				source: 'canvas-button',
				target: 'all',
			});
		});

		it('should not send telemetry event when trackEvents is false', () => {
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};

			const { tidyUp } = useCanvasOperations();
			tidyUp(event, { trackEvents: false });

			expect(useTelemetry().track).not.toHaveBeenCalled();
		});

		it('should send telemetry event when trackEvents is undefined (default behavior)', () => {
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};

			const { tidyUp } = useCanvasOperations();
			tidyUp(event, {}); // No trackEvents specified, should default to true

			expect(useTelemetry().track).toHaveBeenCalledWith('User tidied up canvas', {
				nodes_count: 2,
				source: 'canvas-button',
				target: 'all',
			});
		});
	});

	describe('updateNodePosition', () => {
		it('should update node position', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const id = 'node1';
			const position: CanvasNode['position'] = { x: 10, y: 20 };
			const node = createTestNode({
				id,
				type: 'node',
				position: [0, 0],
				name: 'Node 1',
			});
			const setNodePositionByIdSpy = vi.spyOn(workflowState, 'setNodePositionById');

			workflowsStore.getNodeById.mockReturnValueOnce(node);

			const { updateNodePosition } = useCanvasOperations();
			updateNodePosition(id, position);

			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(id, [position.x, position.y]);
		});
	});

	describe('setNodeSelected', () => {
		it('should set last selected node when node id is provided and node exists', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = useUIStore();
			const nodeId = 'node1';
			const nodeName = 'Node 1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue({ name: nodeName });
			uiStore.lastSelectedNode = '';

			const { setNodeSelected } = useCanvasOperations();
			setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe(nodeName);
		});

		it('should not change last selected node when node id is provided but node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = useUIStore();
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			uiStore.lastSelectedNode = 'Existing Node';

			const { setNodeSelected } = useCanvasOperations();
			setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe('Existing Node');
		});

		it('should clear last selected node when node id is not provided', () => {
			const uiStore = useUIStore();
			uiStore.lastSelectedNode = 'Existing Node';

			const { setNodeSelected } = useCanvasOperations();
			setNodeSelected();

			expect(uiStore.lastSelectedNode).toBe('');
		});
	});

	describe('addNodes', () => {
		it('should add nodes at specified positions', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [32, 32] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [96, 256] }),
			];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, {});

			expect(workflowsStore.addNode).toHaveBeenCalledTimes(2);
			expect(workflowsStore.addNode.mock.calls[0][0]).toMatchObject({
				name: nodes[0].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [32, 32],
				parameters: {},
			});
			expect(workflowsStore.addNode.mock.calls[1][0]).toMatchObject({
				name: nodes[1].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [96, 256],
				parameters: {},
			});
		});

		it('should add nodes at current position when position is not specified', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [128, 128] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [192, 320] }),
			];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, { position: [50, 60] });

			expect(workflowsStore.addNode).toHaveBeenCalledTimes(2);
			expect(workflowsStore.addNode.mock.calls[0][0].position).toEqual(
				expect.arrayContaining(nodes[0].position),
			);
			expect(workflowsStore.addNode.mock.calls[1][0].position).toEqual(
				expect.arrayContaining(nodes[1].position),
			);
		});

		it('should adjust the position of nodes with multiple inputs', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [32, 32] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [32, 32] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [96, 256] }),
			];

			const setNodePositionByIdSpy = vi.spyOn(workflowState, 'setNodePositionById');
			workflowsStore.getNodeByName.mockReturnValueOnce(nodes[1]).mockReturnValueOnce(nodes[2]);
			workflowsStore.getNodeById.mockReturnValueOnce(nodes[1]).mockReturnValueOnce(nodes[2]);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			workflowsStore.workflowObject = mock<Workflow>({
				getParentNodesByDepth: () =>
					nodes.map((node) => ({
						name: node.name,
						depth: 0,
						indicies: [],
					})),
			});

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, {});

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[1].id, expect.any(Object));
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[2].id, expect.any(Object));
		});

		it('should return newly added nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [96, 240] }),
			];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			const added = await addNodes(nodes, {});
			expect(added.length).toBe(2);
		});

		it('should mark UI state as dirty', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] })];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, { keepPristine: false });

			expect(uiStore.stateIsDirty).toEqual(true);
		});

		it('should not mark UI state as dirty if keepPristine is true', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] })];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, { keepPristine: true });

			expect(uiStore.stateIsDirty).toEqual(false);
		});

		it('should pass actionName to telemetry when adding nodes with actions', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeCreatorStore = mockedStore(useNodeCreatorStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'hubspot';
			const actionName = 'Create Contact';
			const nodes = [
				{
					...mockNode({
						name: 'HubSpot Node',
						type: nodeTypeName,
						position: [100, 100],
					}),
					actionName,
				},
			];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			nodeCreatorStore.onNodeAddedToCanvas = vi.fn();

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, { telemetry: true });

			expect(nodeCreatorStore.onNodeAddedToCanvas).toHaveBeenCalledWith(
				expect.objectContaining({
					action: actionName,
					node_type: nodeTypeName,
				}),
			);
		});
	});

	describe('revertAddNode', () => {
		it('deletes node if it exists', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node = createTestNode();
			workflowsStore.getNodeByName.mockReturnValueOnce(node);
			workflowsStore.getNodeById.mockReturnValueOnce(node);
			const removeNodeByIdSpy = vi.spyOn(workflowsStore, 'removeNodeById');

			const { revertAddNode } = useCanvasOperations();
			await revertAddNode(node.name);

			expect(removeNodeByIdSpy).toHaveBeenCalledWith(node.id);
		});
	});

	describe('deleteNode', () => {
		it('should delete node and track history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			const id = 'node1';
			const node: INodeUi = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
			});

			workflowsStore.getNodeById.mockReturnValue(node);

			const { deleteNode } = useCanvasOperations();
			deleteNode(id, { trackHistory: true });

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(id);
			expect(historyStore.pushCommandToUndo).toHaveBeenCalledWith(
				new RemoveNodeCommand(node, expect.any(Number)),
			);
		});

		it('should delete node without tracking history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			const id = 'node1';
			const node = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
				parameters: {},
			});

			workflowsStore.getNodeById.mockReturnValue(node);

			const { deleteNode } = useCanvasOperations();
			deleteNode(id, { trackHistory: false });

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(id);
			expect(historyStore.pushCommandToUndo).not.toHaveBeenCalled();
		});

		it('should connect adjacent nodes when deleting a node surrounded by other nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: mockNodeTypeDescription({ name: SET_NODE_TYPE }) },
			};

			const nodes = [
				createTestNode({
					id: 'input',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Input Node',
				}),
				createTestNode({
					id: 'middle',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Middle Node',
				}),
				createTestNode({
					id: 'output',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Output Node',
				}),
			];

			workflowsStore.workflow.nodes = nodes;
			workflowsStore.workflow.connections = {
				[nodes[0].name]: {
					main: [
						[
							{
								node: nodes[1].name,
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
				[nodes[1].name]: {
					main: [
						[
							{
								node: nodes[2].name,
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			workflowsStore.getNodeById.mockReturnValue(nodes[1]);

			const { deleteNode } = useCanvasOperations();
			deleteNode(nodes[1].id);

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
		});

		it('should handle nodes with null connections for unconnected indexes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: mockNodeTypeDescription({ name: SET_NODE_TYPE }) },
			};

			const nodes = [
				createTestNode({
					id: 'input',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Input Node',
				}),
				createTestNode({
					id: 'middle',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Middle Node',
				}),
				createTestNode({
					id: 'output',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Output Node',
				}),
			];

			workflowsStore.getNodeByName = vi
				.fn()
				.mockImplementation((name: string) => nodes.find((node) => node.name === name));

			workflowsStore.workflow.nodes = nodes;
			workflowsStore.workflow.connections = {
				[nodes[0].name]: {
					main: [
						null,
						[
							{
								node: nodes[1].name,
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
				[nodes[1].name]: {
					main: [
						// null here to simulate no connection at index
						null,
						[
							{
								node: nodes[2].name,
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			workflowsStore.getNodeById.mockReturnValue(nodes[1]);

			const { deleteNode } = useCanvasOperations();
			deleteNode(nodes[1].id);

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
		});
	});

	describe('revertDeleteNode', () => {
		it('should revert delete node', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const node = createTestNode({
				id: 'node1',
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
				parameters: {},
			});

			const { revertDeleteNode } = useCanvasOperations();
			revertDeleteNode(node);

			expect(workflowsStore.addNode).toHaveBeenCalledWith(node);
		});
	});

	describe('renameNode', () => {
		it('should rename node', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			const newName = 'New Node';

			const workflowObject = createTestWorkflowObject();
			workflowObject.renameNode = vi.fn();
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { renameNode } = useCanvasOperations();
			await renameNode(oldName, newName);

			expect(workflowObject.renameNode).toHaveBeenCalledWith(oldName, newName);
			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(newName, expect.any(String));
		});

		it('should not rename node when new name is same as old name', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { renameNode } = useCanvasOperations();
			await renameNode(oldName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});

		it('should show error toast when renameNode throws an error', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const toast = useToast();
			const oldName = 'Old Node';
			const newName = 'New Node';
			const errorMessage = 'Node name already exists';
			const errorDescription = 'Please choose a different name';

			const workflowObject = createTestWorkflowObject();
			workflowObject.renameNode = vi.fn().mockImplementation(() => {
				const error = new UserError(errorMessage, { description: errorDescription });
				throw error;
			});
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { renameNode } = useCanvasOperations();
			await renameNode(oldName, newName);

			expect(workflowObject.renameNode).toHaveBeenCalledWith(oldName, newName);
			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'error',
				title: errorMessage,
				message: errorDescription,
			});
		});
	});

	describe('revertRenameNode', () => {
		it('should revert node renaming', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			const currentName = 'New Node';

			const workflowObject = createTestWorkflowObject();
			workflowObject.renameNode = vi.fn();
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: currentName });
			ndvStore.activeNodeName = currentName;

			const { revertRenameNode } = useCanvasOperations();
			await revertRenameNode(currentName, oldName);

			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(oldName, expect.any(String));
		});

		it('should not revert node renaming when old name is same as new name', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { revertRenameNode } = useCanvasOperations();
			await revertRenameNode(oldName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});
	});

	describe('setNodeActive', () => {
		it('should set active node name when node exists', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const nodeId = 'node1';
			const nodeName = 'Node 1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue({ name: nodeName });
			ndvStore.activeNodeName = '';

			const { setNodeActive } = useCanvasOperations();
			setNodeActive(nodeId, 'other');

			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(nodeName, expect.any(String));
		});

		it('should not change active node name when node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			ndvStore.activeNodeName = 'Existing Node';

			const { setNodeActive } = useCanvasOperations();
			setNodeActive(nodeId, 'other');

			expect(ndvStore.activeNodeName).toBe('Existing Node');
		});

		it('should set node as dirty when node is set active', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node = createTestNode();

			workflowsStore.getNodeById.mockImplementation(() => node);

			const { setNodeActive } = useCanvasOperations();
			setNodeActive(node.id, 'other');

			expect(workflowsStore.setNodePristine).toHaveBeenCalledWith(node.name, false);
		});
	});

	describe('setNodeActiveByName', () => {
		it('should set active node name', () => {
			const ndvStore = useNDVStore();
			const nodeName = 'Node 1';
			ndvStore.activeNodeName = '';

			const { setNodeActiveByName } = useCanvasOperations();
			setNodeActiveByName(nodeName, 'other');

			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(nodeName, expect.any(String));
		});
	});

	describe('toggleNodesDisabled', () => {
		it('disables nodes based on provided ids', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodes = [
				createTestNode({ id: '1', name: 'A' }),
				createTestNode({ id: '2', name: 'B' }),
			];
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			const updateNodePropertiesSpy = vi.spyOn(workflowState, 'updateNodeProperties');

			const { toggleNodesDisabled } = useCanvasOperations();
			toggleNodesDisabled([nodes[0].id, nodes[1].id], {
				trackHistory: true,
				trackBulk: true,
			});

			expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
				name: nodes[0].name,
				properties: {
					disabled: true,
				},
			});
		});
	});

	describe('revertToggleNodeDisabled', () => {
		it('re-enables a previously disabled node', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeName = 'testNode';
			const node = createTestNode({ name: nodeName });
			workflowsStore.getNodeByName.mockReturnValue(node);
			const updateNodePropertiesSpy = vi.spyOn(workflowState, 'updateNodeProperties');

			const { revertToggleNodeDisabled } = useCanvasOperations();
			revertToggleNodeDisabled(nodeName);

			expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
				name: nodeName,
				properties: {
					disabled: true,
				},
			});
		});
	});

	describe('addConnections', () => {
		it('should create connections between nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeTypeName = SET_NODE_TYPE;
			const nodeType = mockNodeTypeDescription({
				name: nodeTypeName,
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
			});
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [40, 40] }),
			];
			const connections = [
				{
					source: nodes[0].id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					target: nodes[1].id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					data: {
						source: { type: NodeConnectionTypes.Main, index: 0 },
						target: { type: NodeConnectionTypes.Main, index: 0 },
					},
				},
				{
					source: nodes[1].id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					target: nodes[2].id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					data: {
						source: { type: NodeConnectionTypes.Main, index: 0 },
						target: { type: NodeConnectionTypes.Main, index: 0 },
					},
				},
			];

			workflowsStore.workflow.nodes = nodes;
			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: nodeType },
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.getNodeById.mockReturnValueOnce(nodes[0]).mockReturnValueOnce(nodes[1]);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);

			const { addConnections } = useCanvasOperations();
			await addConnections(connections);

			expect(workflowsStore.addConnection).toHaveBeenCalledWith({
				connection: [
					{
						index: 0,
						node: 'Node A',
						type: NodeConnectionTypes.Main,
					},
					{
						index: 0,
						node: 'Node B',
						type: NodeConnectionTypes.Main,
					},
				],
			});
		});

		it('should set UI state as dirty', async () => {
			const uiStore = mockedStore(useUIStore);
			const connections: CanvasConnection[] = [];

			const { addConnections } = useCanvasOperations();
			await addConnections(connections, { keepPristine: false });

			expect(uiStore.stateIsDirty).toBe(true);
		});

		it('should not set UI state as dirty if keepPristine is true', async () => {
			const uiStore = mockedStore(useUIStore);
			const connections: CanvasConnection[] = [];

			const { addConnections } = useCanvasOperations();
			await addConnections(connections, { keepPristine: true });

			expect(uiStore.stateIsDirty).toBe(false);
		});
	});

	describe('createConnection', () => {
		it('should not create a connection if source node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const connection: Connection = { source: 'nonexistent', target: 'targetNode' };

			workflowsStore.getNodeById.mockReturnValueOnce(undefined);

			const { createConnection } = useCanvasOperations();
			createConnection(connection);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should not create a connection if target node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const connection: Connection = { source: 'sourceNode', target: 'nonexistent' };

			workflowsStore.getNodeById
				.mockReturnValueOnce(createTestNode())
				.mockReturnValueOnce(undefined);

			const { createConnection } = useCanvasOperations();
			createConnection(connection);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should create a connection if source and target nodes exist and connection is allowed', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const nodeTypeDescription = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
			});

			const nodeA = createTestNode({
				id: 'a',
				type: nodeTypeDescription.name,
				name: 'Node A',
			});

			const nodeB = createTestNode({
				id: 'b',
				type: nodeTypeDescription.name,
				name: 'Node B',
			});

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: `outputs/${NodeConnectionTypes.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionTypes.Main}/0`,
			};

			nodeTypesStore.nodeTypes = {
				node: { 1: nodeTypeDescription },
			};

			workflowsStore.workflow.nodes = [nodeA, nodeB];
			workflowsStore.getNodeById.mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { createConnection, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[nodeA.name] = nodeA;
			editableWorkflowObject.value.nodes[nodeB.name] = nodeB;

			createConnection(connection);

			expect(workflowsStore.addConnection).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: NodeConnectionTypes.Main },
					{ index: 0, node: nodeB.name, type: NodeConnectionTypes.Main },
				],
			});
			expect(uiStore.stateIsDirty).toBe(true);
		});

		it('should not set UI state as dirty if keepPristine is true', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const nodeTypeDescription = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
			});

			const nodeA = createTestNode({
				id: 'a',
				type: nodeTypeDescription.name,
				name: 'Node A',
			});

			const nodeB = createTestNode({
				id: 'b',
				type: nodeTypeDescription.name,
				name: 'Node B',
			});

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: `outputs/${NodeConnectionTypes.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionTypes.Main}/0`,
			};

			nodeTypesStore.nodeTypes = {
				node: { 1: nodeTypeDescription },
			};

			workflowsStore.workflow.nodes = [nodeA, nodeB];
			workflowsStore.getNodeById.mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { createConnection, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[nodeA.name] = nodeA;
			editableWorkflowObject.value.nodes[nodeB.name] = nodeB;

			createConnection(connection, { keepPristine: true });

			expect(uiStore.stateIsDirty).toBe(false);
		});
	});

	describe('revertCreateConnection', () => {
		it('deletes connection if both source and target nodes exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const connection: [IConnection, IConnection] = [
				{ node: 'sourceNode', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'targetNode', type: NodeConnectionTypes.Main, index: 0 },
			];
			const testNode = createTestNode();

			workflowsStore.getNodeByName.mockReturnValue(testNode);
			workflowsStore.getNodeById.mockReturnValue(testNode);

			const { revertCreateConnection } = useCanvasOperations();
			revertCreateConnection(connection);

			expect(workflowsStore.removeConnection).toHaveBeenCalled();
		});
	});

	describe('isConnectionAllowed', () => {
		it('should return false if target node type does not have inputs', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};
			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			const { isConnectionAllowed } = useCanvasOperations();
			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if target node does not exist in the workflow', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};
			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [NodeConnectionTypes.Main],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			const { isConnectionAllowed } = useCanvasOperations();
			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if source node does not have connection type', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.AiTool,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionTypes.AiTool],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.AiTool,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if target node does not have connection type', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionTypes.AiTool],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.AiTool,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if source node type is not allowed by target node input filter', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [
					{
						type: NodeConnectionTypes.Main,
						filter: {
							nodes: ['allowedType'],
						},
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if source node type does not have connection type index', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 1,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionTypes.Main,
						filter: {
							nodes: [sourceNode.type],
						},
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if target node type does not have connection type index', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionTypes.Main,
						filter: {
							nodes: [sourceNode.type],
						},
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 1,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return true if all conditions including filter are met', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionTypes.Main,
						filter: {
							nodes: [sourceNode.type],
						},
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(true);
		});

		it('should return true if all conditions are met and no filter is set', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionTypes.Main,
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(true);
		});

		it('should return true if node connecting to itself', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};
			const targetHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations();

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, sourceNode, sourceHandle, targetHandle)).toBe(true);
		});
	});

	describe('deleteConnection', () => {
		it('should not delete a connection if source node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const connection: Connection = { source: 'nonexistent', target: 'targetNode' };

			workflowsStore.getNodeById
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce(createTestNode());

			const { deleteConnection } = useCanvasOperations();
			deleteConnection(connection);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should not delete a connection if target node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const connection: Connection = { source: 'sourceNode', target: 'nonexistent' };

			workflowsStore.getNodeById
				.mockReturnValueOnce(createTestNode())
				.mockReturnValueOnce(undefined);

			const { deleteConnection } = useCanvasOperations();
			deleteConnection(connection);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should delete a connection if source and target nodes exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const nodeA = createTestNode({
				id: 'a',
				type: 'node',
				name: 'Node A',
			});

			const nodeB = createTestNode({
				id: 'b',
				type: 'node',
				name: 'Node B',
			});

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: `outputs/${NodeConnectionTypes.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionTypes.Main}/0`,
			};

			workflowsStore.getNodeById.mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);

			const { deleteConnection } = useCanvasOperations();
			deleteConnection(connection);

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: NodeConnectionTypes.Main },
					{ index: 0, node: nodeB.name, type: NodeConnectionTypes.Main },
				],
			});
		});
	});

	describe('revertDeleteConnection', () => {
		it('should revert delete connection', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const connection: [IConnection, IConnection] = [
				{ node: 'sourceNode', type: NodeConnectionTypes.Main, index: 1 },
				{ node: 'targetNode', type: NodeConnectionTypes.Main, index: 2 },
			];

			const { revertDeleteConnection } = useCanvasOperations();
			revertDeleteConnection(connection);

			expect(workflowsStore.addConnection).toHaveBeenCalledWith({ connection });
		});
	});

	describe('revalidateNodeInputConnections', () => {
		it('should not delete connections when target node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nonexistentId = 'nonexistent';
			workflowsStore.getNodeById.mockReturnValue(undefined);

			const { revalidateNodeInputConnections } = useCanvasOperations();
			revalidateNodeInputConnections(nonexistentId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should not delete connections when node type description is not found', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeId = 'test-node';
			const node = createTestNode({ id: nodeId, type: 'unknown-type' });

			workflowsStore.getNodeById.mockReturnValue(node);
			nodeTypesStore.getNodeType = () => null;

			const { revalidateNodeInputConnections } = useCanvasOperations();
			revalidateNodeInputConnections(nodeId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should remove invalid connections that do not match input type', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			workflowsStore.removeConnection = vi.fn();

			const targetNodeId = 'target';
			const targetNode = createTestNode({
				id: targetNodeId,
				name: 'Target Node',
				type: SET_NODE_TYPE,
			});
			const targetNodeType = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionTypes.Main],
			});

			const sourceNodeId = 'source';
			const sourceNode = createTestNode({
				id: sourceNodeId,
				name: 'Source Node',
				type: AGENT_NODE_TYPE,
			});
			const sourceNodeType = mockNodeTypeDescription({
				name: AGENT_NODE_TYPE,
				outputs: [NodeConnectionTypes.AiTool],
			});

			workflowsStore.workflow.nodes = [sourceNode, targetNode];
			workflowsStore.workflow.connections = {
				[sourceNode.name]: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			workflowsStore.getNodeById
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode)
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode);

			nodeTypesStore.getNodeType = vi
				.fn()
				.mockReturnValueOnce(targetNodeType)
				.mockReturnValueOnce(sourceNodeType);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			const { revalidateNodeInputConnections } = useCanvasOperations();
			revalidateNodeInputConnections(targetNodeId);

			await nextTick();

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: sourceNode.name, type: NodeConnectionTypes.AiTool, index: 0 },
					{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});
		});

		it('should keep valid connections that match input type', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			workflowsStore.removeConnection = vi.fn();

			const targetNodeId = 'target';
			const targetNode = createTestNode({
				id: targetNodeId,
				name: 'Target Node',
				type: SET_NODE_TYPE,
			});
			const targetNodeType = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionTypes.Main],
			});

			const sourceNodeId = 'source';
			const sourceNode = createTestNode({
				id: sourceNodeId,
				name: 'Source Node',
				type: AGENT_NODE_TYPE,
			});
			const sourceNodeType = mockNodeTypeDescription({
				name: AGENT_NODE_TYPE,
				outputs: [NodeConnectionTypes.Main],
			});

			workflowsStore.workflow.nodes = [sourceNode, targetNode];
			workflowsStore.workflow.connections = {
				[sourceNode.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			workflowsStore.getNodeById
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode)
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode);

			nodeTypesStore.getNodeType = vi
				.fn()
				.mockReturnValueOnce(targetNodeType)
				.mockReturnValueOnce(sourceNodeType);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			const { revalidateNodeInputConnections } = useCanvasOperations();
			revalidateNodeInputConnections(targetNodeId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});
	});

	describe('revalidateNodeOutputConnections', () => {
		it('should not delete connections when source node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nonexistentId = 'nonexistent';
			workflowsStore.getNodeById.mockReturnValue(undefined);

			const { revalidateNodeOutputConnections } = useCanvasOperations();
			revalidateNodeOutputConnections(nonexistentId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should not delete connections when node type description is not found', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeId = 'test-node';
			const node = createTestNode({ id: nodeId, type: 'unknown-type' });

			workflowsStore.getNodeById.mockReturnValue(node);
			nodeTypesStore.getNodeType = () => null;

			const { revalidateNodeOutputConnections } = useCanvasOperations();
			revalidateNodeOutputConnections(nodeId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should remove invalid connections that do not match output type', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			workflowsStore.removeConnection = vi.fn();

			const targetNodeId = 'target';
			const targetNode = createTestNode({
				id: targetNodeId,
				name: 'Target Node',
				type: SET_NODE_TYPE,
			});
			const targetNodeType = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionTypes.Main],
			});

			const sourceNodeId = 'source';
			const sourceNode = createTestNode({
				id: sourceNodeId,
				name: 'Source Node',
				type: AGENT_NODE_TYPE,
			});
			const sourceNodeType = mockNodeTypeDescription({
				name: AGENT_NODE_TYPE,
				outputs: [NodeConnectionTypes.AiTool],
			});

			workflowsStore.workflow.nodes = [sourceNode, targetNode];
			workflowsStore.workflow.connections = {
				[sourceNode.name]: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			workflowsStore.getNodeById
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode)
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode);

			nodeTypesStore.getNodeType = vi
				.fn()
				.mockReturnValueOnce(targetNodeType)
				.mockReturnValueOnce(sourceNodeType);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			const { revalidateNodeOutputConnections } = useCanvasOperations();
			revalidateNodeOutputConnections(sourceNodeId);

			await nextTick();

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: sourceNode.name, type: NodeConnectionTypes.AiTool, index: 0 },
					{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});
		});

		it('should keep valid connections that match output type', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			workflowsStore.removeConnection = vi.fn();

			const targetNodeId = 'target';
			const targetNode = createTestNode({
				id: targetNodeId,
				name: 'Target Node',
				type: SET_NODE_TYPE,
			});
			const targetNodeType = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionTypes.Main],
			});

			const sourceNodeId = 'source';
			const sourceNode = createTestNode({
				id: sourceNodeId,
				name: 'Source Node',
				type: AGENT_NODE_TYPE,
			});
			const sourceNodeType = mockNodeTypeDescription({
				name: AGENT_NODE_TYPE,
				outputs: [NodeConnectionTypes.Main],
			});

			workflowsStore.workflow.nodes = [sourceNode, targetNode];
			workflowsStore.workflow.connections = {
				[sourceNode.name]: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			workflowsStore.getNodeById
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode)
				.mockReturnValueOnce(sourceNode)
				.mockReturnValueOnce(targetNode);

			nodeTypesStore.getNodeType = vi
				.fn()
				.mockReturnValueOnce(targetNodeType)
				.mockReturnValueOnce(sourceNodeType);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			const { revalidateNodeOutputConnections } = useCanvasOperations();
			revalidateNodeOutputConnections(sourceNodeId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});
	});

	describe('deleteConnectionsByNodeId', () => {
		it('should delete all connections for a given node ID', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { deleteConnectionsByNodeId } = useCanvasOperations();

			const node1 = createTestNode({ id: 'node1', name: 'Node 1' });
			const node2 = createTestNode({ id: 'node2', name: 'Node 1' });

			workflowsStore.workflow.connections = {
				[node1.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: node2.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				node2: {
					[NodeConnectionTypes.Main]: [
						[{ node: node1.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			workflowsStore.getNodeById.mockReturnValue(node1);
			workflowsStore.getNodeByName.mockReturnValueOnce(node1).mockReturnValueOnce(node2);

			deleteConnectionsByNodeId(node1.id);

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: node1.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: node2.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: node2.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: node1.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});

			expect(workflowsStore.workflow.connections[node1.name]).toBeUndefined();
		});

		it('should not delete connections if node ID does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { deleteConnectionsByNodeId } = useCanvasOperations();

			const nodeId = 'nonexistent';
			workflowsStore.getNodeById.mockReturnValue(undefined);

			deleteConnectionsByNodeId(nodeId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should delete all connections of a node with multiple connections', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { deleteConnectionsByNodeId } = useCanvasOperations();

			const sourceNode = createTestNode({ id: 'source', name: 'Source Node' });
			const targetNode = createTestNode({ id: 'target', name: 'Target Node' });

			workflowsStore.workflow.nodes = [sourceNode, targetNode];
			workflowsStore.workflow.connections = {
				[sourceNode.name]: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 },
							{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 1 },
						],
					],
				},
				[targetNode.name]: {
					[NodeConnectionTypes.Main]: [],
				},
			};

			workflowsStore.getNodeById = vi.fn().mockImplementation((id) => {
				if (id === sourceNode.id) return sourceNode;
				if (id === targetNode.id) return targetNode;
				return null;
			});
			workflowsStore.getNodeByName = vi.fn().mockImplementation((name) => {
				if (name === sourceNode.name) return sourceNode;
				if (name === targetNode.name) return targetNode;
				return null;
			});

			workflowsStore.removeConnection = vi
				.fn()
				.mockImplementation((data: { connection: IConnection[] }) => {
					const sourceData = data.connection[0];
					const destinationData = data.connection[1];

					const connections =
						workflowsStore.workflow.connections[sourceData.node][sourceData.type][sourceData.index];

					for (const index in connections) {
						if (
							connections[+index].node === destinationData.node &&
							connections[+index].type === destinationData.type &&
							connections[+index].index === destinationData.index
						) {
							connections.splice(parseInt(index, 10), 1);
						}
					}
				});

			deleteConnectionsByNodeId(targetNode.id);

			expect(workflowsStore.removeConnection).toHaveBeenCalledTimes(2);

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: sourceNode.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: sourceNode.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 1 },
				],
			});

			expect(
				workflowsStore.workflow.connections[sourceNode.name][NodeConnectionTypes.Main][0],
			).toEqual([]);
		});
	});

	describe('copyNodes', () => {
		it('should copy nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowsStore.workflow.nodes = nodes;
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});

			const { copyNodes } = useCanvasOperations();
			await copyNodes(['1', '2']);

			expect(useClipboard().copy).toHaveBeenCalledTimes(1);
			expect(vi.mocked(useClipboard().copy).mock.calls).toMatchSnapshot();
		});
	});

	describe('cutNodes', () => {
		it('should copy and delete nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowsStore.workflow.nodes = nodes;
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});

			const { cutNodes } = useCanvasOperations();
			await cutNodes(['1', '2']);
			expect(useClipboard().copy).toHaveBeenCalledTimes(1);
			expect(vi.mocked(useClipboard().copy).mock.calls).toMatchSnapshot();
		});
	});

	describe('resolveNodeWebhook', () => {
		const nodeTypeDescription = mock<INodeTypeDescription>({
			webhooks: [mock<IWebhookDescription>()],
		});

		it("should set webhookId if it doesn't already exist", () => {
			const node = mock<INodeUi>({ webhookId: undefined });

			const { resolveNodeWebhook } = useCanvasOperations();
			resolveNodeWebhook(node, nodeTypeDescription);

			expect(node.webhookId).toBeDefined();
		});

		it('should not set webhookId if it already exists', () => {
			const node = mock<INodeUi>({ webhookId: 'random-id' });

			const { resolveNodeWebhook } = useCanvasOperations();
			resolveNodeWebhook(node, nodeTypeDescription);

			expect(node.webhookId).toBe('random-id');
		});

		it("should not set webhookId if node description doesn't define any webhooks", () => {
			const node = mock<INodeUi>({ webhookId: undefined });

			const { resolveNodeWebhook } = useCanvasOperations();
			resolveNodeWebhook(node, mock<INodeTypeDescription>({ webhooks: [] }));

			expect(node.webhookId).toBeUndefined();
		});

		test.each([WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE])(
			'should update the webhook path, if the node type is %s, and the path parameter is empty',
			(nodeType) => {
				const node = mock<INodeUi>({
					webhookId: 'random-id',
					type: nodeType,
					parameters: { path: '' },
				});

				const { resolveNodeWebhook } = useCanvasOperations();
				resolveNodeWebhook(node, nodeTypeDescription);

				expect(node.webhookId).toBe('random-id');
				expect(node.parameters.path).toBe('random-id');
			},
		);
	});

	describe('initializeWorkspace', () => {
		it('should initialize the workspace', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const workflow = createTestWorkflow({
				nodes: [createTestNode()],
				connections: {},
			});

			const { initializeWorkspace } = useCanvasOperations();
			initializeWorkspace(workflow);

			expect(workflowsStore.setNodes).toHaveBeenCalled();
			expect(workflowsStore.setConnections).toHaveBeenCalled();
		});

		it('should initialize node data from node type description', () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const type = SET_NODE_TYPE;
			const version = 1;
			const expectedDescription = mockNodeTypeDescription({
				name: type,
				version,
				properties: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'boolean',
						default: true,
					},
				],
			});

			nodeTypesStore.nodeTypes = { [type]: { [version]: expectedDescription } };

			const workflow = createTestWorkflow({
				nodes: [createTestNode()],
				connections: {},
			});

			const { initializeWorkspace } = useCanvasOperations();
			initializeWorkspace(workflow);

			expect(workflow.nodes[0].parameters).toEqual({ value: true });
		});
	});

	describe('resetWorkspace', () => {
		it('should reset the workspace', () => {
			const nodeCreatorStore = mockedStore(useNodeCreatorStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const executionsStore = mockedStore(useExecutionsStore);

			const credentialsUpdatedRef = ref(true);
			const credentialsSpy = vi.spyOn(credentialsUpdatedRef, 'value', 'set');
			const nodeHelpersOriginal = nodeHelpers.useNodeHelpers();
			vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
				return {
					...nodeHelpersOriginal,
					credentialsUpdated: credentialsUpdatedRef,
				};
			});
			const resetStateSpy = vi.spyOn(workflowState, 'resetState');

			nodeCreatorStore.setNodeCreatorState = vi.fn();
			nodeCreatorStore.setShowScrim = vi.fn();
			workflowsStore.removeTestWebhook = vi.fn();
			workflowsStore.resetWorkflow = vi.fn();
			workflowsStore.resetState = vi.fn();
			const setActiveExecutionId = vi.spyOn(workflowState, 'setActiveExecutionId');
			uiStore.resetLastInteractedWith = vi.fn();
			executionsStore.activeExecution = null;

			workflowsStore.executionWaitingForWebhook = true;
			workflowsStore.workflowId = 'workflow-id';
			workflowsStore.currentWorkflowExecutions = [
				{
					id: '1',
					status: 'success',
					mode: 'retry',
					workflowId: 'workflow-id',
					createdAt: new Date(),
					startedAt: new Date(),
				},
				{
					id: '2',
					status: 'running',
					mode: 'error',
					workflowId: 'workflow-id',
					createdAt: new Date(),
					startedAt: new Date(),
				},
			];

			const { resetWorkspace } = useCanvasOperations();

			resetWorkspace();

			expect(nodeCreatorStore.setNodeCreatorState).toHaveBeenCalledWith({
				createNodeActive: false,
			});
			expect(nodeCreatorStore.setShowScrim).toHaveBeenCalledWith(false);
			expect(workflowsStore.removeTestWebhook).toHaveBeenCalledWith('workflow-id');
			expect(workflowsStore.resetWorkflow).toHaveBeenCalled();
			expect(resetStateSpy).toHaveBeenCalled();
			expect(workflowsStore.currentWorkflowExecutions).toEqual([]);
			expect(setActiveExecutionId).toHaveBeenCalledWith(undefined);
			expect(uiStore.resetLastInteractedWith).toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
			expect(executionsStore.activeExecution).toBeNull();
			expect(credentialsSpy).toHaveBeenCalledWith(false);
			expect(credentialsUpdatedRef.value).toBe(false);
		});

		it('should not call removeTestWebhook if executionWaitingForWebhook is false', () => {
			const nodeCreatorStore = mockedStore(useNodeCreatorStore);
			const workflowsStore = mockedStore(useWorkflowsStore);

			nodeCreatorStore.setNodeCreatorState = vi.fn();
			nodeCreatorStore.setShowScrim = vi.fn();
			workflowsStore.removeTestWebhook = vi.fn();

			workflowsStore.executionWaitingForWebhook = false;

			const { resetWorkspace } = useCanvasOperations();

			resetWorkspace();

			expect(workflowsStore.removeTestWebhook).not.toHaveBeenCalled();
		});
	});

	describe('filterConnectionsByNodes', () => {
		it('should return filtered connections when all nodes are included', () => {
			const connections: INodeConnections = {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 },
					],
					[{ node: 'node3', type: NodeConnectionTypes.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>(['node1', 'node2', 'node3']);

			const { filterConnectionsByNodes } = useCanvasOperations();
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual(connections);
		});

		it('should return empty connections when no nodes are included', () => {
			const connections: INodeConnections = {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 },
					],
					[{ node: 'node3', type: NodeConnectionTypes.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>();

			const { filterConnectionsByNodes } = useCanvasOperations();
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({
				[NodeConnectionTypes.Main]: [[], []],
			});
		});

		it('should return partially filtered connections when some nodes are included', () => {
			const connections: INodeConnections = {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 },
					],
					[{ node: 'node3', type: NodeConnectionTypes.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>(['node1']);

			const { filterConnectionsByNodes } = useCanvasOperations();
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({
				[NodeConnectionTypes.Main]: [
					[{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 }],
					[],
				],
			});
		});

		it('should handle empty connections input', () => {
			const connections: INodeConnections = {};
			const includeNodeNames = new Set<string>(['node1']);

			const { filterConnectionsByNodes } = useCanvasOperations();
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({});
		});

		it('should handle connections with no valid nodes', () => {
			const connections: INodeConnections = {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'node4', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'node5', type: NodeConnectionTypes.Main, index: 0 },
					],
					[{ node: 'node6', type: NodeConnectionTypes.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>(['node1', 'node2', 'node3']);

			const { filterConnectionsByNodes } = useCanvasOperations();
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({
				[NodeConnectionTypes.Main]: [[], []],
			});
		});
	});

	describe('openExecution', () => {
		it('should initialize workspace and set execution data when execution is found', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

			const { openExecution } = useCanvasOperations();

			const executionId = '123';
			const executionData: IExecutionResponse = {
				id: executionId,
				finished: true,
				status: 'success',
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: createTestWorkflow(),
				mode: 'manual' as WorkflowExecuteMode,
			};

			workflowsStore.getExecution.mockResolvedValue(executionData);

			const result = await openExecution(executionId);

			expect(setWorkflowExecutionData).toHaveBeenCalledWith(executionData);
			expect(uiStore.stateIsDirty).toBe(false);
			expect(result).toEqual(executionData);
		});

		it('should throw error when execution data is undefined', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const executionId = '123';
			const { openExecution } = useCanvasOperations();

			workflowsStore.getExecution.mockResolvedValue(undefined);

			await expect(openExecution(executionId)).rejects.toThrow(
				`Execution with id "${executionId}" could not be found!`,
			);
		});

		it('should clear workflow pin data if execution mode is not manual', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { openExecution } = useCanvasOperations();

			const executionId = '123';
			const executionData: IExecutionResponse = {
				id: executionId,
				finished: true,
				status: 'success',
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: createTestWorkflow(),
				mode: 'trigger' as WorkflowExecuteMode,
			};

			workflowsStore.getExecution.mockResolvedValue(executionData);

			await openExecution(executionId);

			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith({});
		});
		it('should show an error notification for failed executions', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { openExecution } = useCanvasOperations();
			const toast = useToast();

			const executionId = '123';
			const executionData: IExecutionResponse = {
				id: executionId,
				finished: true,
				status: 'error',
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: createTestWorkflow(),
				mode: 'manual',
				data: {
					resultData: {
						error: { message: 'Crashed', node: { name: 'Step1' } },
						lastNodeExecuted: 'Last Node',
					},
				} as IExecutionResponse['data'],
			};

			workflowsStore.getExecution.mockResolvedValue(executionData);

			await openExecution(executionId);

			expect(toast.showMessage).toHaveBeenCalledWith({
				duration: 0,
				message: 'Crashed',
				title: 'Problem in node ‘Last Node‘',
				type: 'error',
			});
		});
		it('should set active node when nodeId is provided and node exists', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const { openExecution } = useCanvasOperations();

			const executionId = '123';
			const nodeId = 'node-123';
			const mockNode = { id: nodeId, name: 'Test Node', type: 'test' } as INodeUi;
			const executionData: IExecutionResponse = {
				id: executionId,
				finished: true,
				status: 'success',
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: createTestWorkflow(),
				mode: 'manual' as WorkflowExecuteMode,
			};

			workflowsStore.getExecution.mockResolvedValue(executionData);
			workflowsStore.getNodeById.mockReturnValue(mockNode);

			await openExecution(executionId, nodeId);

			expect(workflowsStore.getNodeById).toHaveBeenCalledWith(nodeId);
			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(mockNode.name, expect.any(String));
		});

		it('should show error when nodeId is provided but node does not exist', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { openExecution } = useCanvasOperations();
			const toast = useToast();

			const executionId = '123';
			const nodeId = 'non-existent-node';
			const executionData: IExecutionResponse = {
				id: executionId,
				finished: true,
				status: 'success',
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: createTestWorkflow(),
				mode: 'manual' as WorkflowExecuteMode,
			};

			workflowsStore.getExecution.mockResolvedValue(executionData);
			workflowsStore.getNodeById.mockReturnValue(undefined);

			await openExecution(executionId, nodeId);

			expect(workflowsStore.getNodeById).toHaveBeenCalledWith(nodeId);
			expect(toast.showError).toHaveBeenCalledWith(
				new Error(`Node with id "${nodeId}" could not be found!`),
				'Problem opening node in execution',
			);
		});
	});

	describe('connectAdjacentNodes', () => {
		it('should connect nodes that were connected through the removed node', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const historyStore = mockedStore(useHistoryStore);

			// Create three nodes in a sequence: A -> B -> C
			const nodeA = createTestNode({ id: 'A', name: 'Node A', position: [0, 0] });
			const nodeB = createTestNode({ id: 'B', name: 'Node B', position: [96, 0] });
			const nodeC = createTestNode({ id: 'C', name: 'Node C', position: [208, 0] });

			const nodeTypeDescription = mockNodeTypeDescription({
				name: nodeA.type,
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
			});

			nodeTypesStore.getNodeType = vi.fn(() => nodeTypeDescription);

			// Set up the workflow connections A -> B -> C
			workflowsStore.workflow.nodes = [nodeA, nodeB, nodeC];
			workflowsStore.workflow.connections = {
				[nodeA.name]: {
					main: [[{ node: nodeB.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
				[nodeB.name]: {
					main: [[{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			// Mock store methods
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.getNodeById.mockImplementation(
				(id: string) =>
					({
						[nodeA.id]: nodeA,
						[nodeB.id]: nodeB,
						[nodeC.id]: nodeC,
					})[id],
			);
			workflowsStore.getNodeByName.mockImplementation(
				(name: string) =>
					({
						[nodeA.name]: nodeA,
						[nodeB.name]: nodeB,
						[nodeC.name]: nodeC,
					})[name],
			);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({
				main: [[{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 0 }]],
			});
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({
				main: [[{ node: nodeA.name, type: NodeConnectionTypes.Main, index: 0 }]],
			});

			const { connectAdjacentNodes } = useCanvasOperations();
			connectAdjacentNodes(nodeB.id, { trackHistory: true });

			// Check that A was connected directly to C
			expect(workflowsStore.addConnection).toHaveBeenCalledWith({
				connection: [
					{ node: nodeA.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});

			// Verify the connection was tracked in history
			expect(historyStore.pushCommandToUndo).toHaveBeenCalled();
		});

		it('should connect nodes that were connected through the removed node at different indices', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const historyStore = mockedStore(useHistoryStore);

			// Create three nodes in a sequence: A -> B -> C
			const nodeA = createTestNode({ id: 'A', name: 'Node A', position: [0, 0] });
			const nodeB = createTestNode({ id: 'B', name: 'Node B', position: [96, 0] });
			const nodeC = createTestNode({ id: 'C', name: 'Node C', position: [208, 0] });

			const nodeTypeDescription = mockNodeTypeDescription({
				name: nodeA.type,
				inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
			});

			nodeTypesStore.getNodeType = vi.fn(() => nodeTypeDescription);

			// Set up the workflow connections A -> B -> C
			workflowsStore.workflow.nodes = [nodeA, nodeB, nodeC];
			workflowsStore.workflow.connections = {
				[nodeA.name]: {
					main: [[{ node: nodeB.name, type: NodeConnectionTypes.Main, index: 1 }]],
				},
				[nodeB.name]: {
					main: [[{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			// Mock store methods
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.getNodeById.mockImplementation(
				(id: string) =>
					({
						[nodeA.id]: nodeA,
						[nodeB.id]: nodeB,
						[nodeC.id]: nodeC,
					})[id],
			);
			workflowsStore.getNodeByName.mockImplementation(
				(name: string) =>
					({
						[nodeA.name]: nodeA,
						[nodeB.name]: nodeB,
						[nodeC.name]: nodeC,
					})[name],
			);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({
				main: [[{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 1 }]],
			});
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({
				main: [[{ node: nodeA.name, type: NodeConnectionTypes.Main, index: 0 }]],
			});

			const { connectAdjacentNodes } = useCanvasOperations();
			connectAdjacentNodes(nodeB.id, { trackHistory: true });

			// Check that A was connected directly to C
			expect(workflowsStore.addConnection).toHaveBeenCalledWith({
				connection: [
					{ node: nodeA.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 1 },
				],
			});

			// Verify the connection was tracked in history
			expect(historyStore.pushCommandToUndo).toHaveBeenCalled();
		});

		it('should not create connections if middle node has no incoming connections', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			// Create nodes: B -> C (no incoming to B)
			const nodeB = createTestNode({ id: 'B', name: 'Node B', position: [96, 0] });
			const nodeC = createTestNode({ id: 'C', name: 'Node C', position: [208, 0] });

			workflowsStore.workflow.nodes = [nodeB, nodeC];
			workflowsStore.workflow.connections = {
				[nodeB.name]: {
					main: [[{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.getNodeById.mockReturnValue(nodeB);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({
				main: [[{ node: nodeC.name, type: NodeConnectionTypes.Main, index: 0 }]],
			});
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			const { connectAdjacentNodes } = useCanvasOperations();
			connectAdjacentNodes(nodeB.id);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
		});

		it('should not create connections if middle node has no outgoing connections', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			// Create nodes: A -> B (no outgoing from B)
			const nodeA = createTestNode({ id: 'A', name: 'Node A', position: [0, 0] });
			const nodeB = createTestNode({ id: 'B', name: 'Node B', position: [96, 0] });

			workflowsStore.workflow.nodes = [nodeA, nodeB];
			workflowsStore.workflow.connections = {
				[nodeA.name]: {
					main: [[{ node: nodeB.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.getNodeById.mockReturnValue(nodeB);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({
				main: [[{ node: nodeA.name, type: NodeConnectionTypes.Main, index: 0 }]],
			});

			const { connectAdjacentNodes } = useCanvasOperations();
			connectAdjacentNodes(nodeB.id);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
		});
	});

	describe('importWorkflowData', () => {
		const workflowData = {
			nodes: [], //buildImportNodes(),
			connections: {},
		};

		it('should track telemetry when trackEvents is true (default)', async () => {
			const telemetry = useTelemetry();

			const canvasOperations = useCanvasOperations();
			await canvasOperations.importWorkflowData(workflowData, 'paste');

			expect(telemetry.track).toHaveBeenCalledWith('User pasted nodes', {
				workflow_id: expect.any(String),
				node_graph_string: expect.any(String),
			});
		});

		it('should track telemetry when trackEvents is explicitly true', async () => {
			const telemetry = useTelemetry();

			const canvasOperations = useCanvasOperations();
			await canvasOperations.importWorkflowData(workflowData, 'duplicate', {
				trackEvents: true,
			});

			expect(telemetry.track).toHaveBeenCalledWith('User duplicated nodes', {
				workflow_id: expect.any(String),
				node_graph_string: expect.any(String),
			});
		});

		it('should not track telemetry when trackEvents is false', async () => {
			const telemetry = useTelemetry();

			const canvasOperations = useCanvasOperations();
			await canvasOperations.importWorkflowData(workflowData, 'paste', {
				trackEvents: false,
			});

			expect(telemetry.track).not.toHaveBeenCalledWith('User pasted nodes', expect.any(Object));
		});

		it('should track different telemetry events for different sources with trackEvents true', async () => {
			const telemetry = useTelemetry();
			const canvasOperations = useCanvasOperations();

			// Test 'paste' source
			await canvasOperations.importWorkflowData(workflowData, 'paste', { trackEvents: true });
			expect(telemetry.track).toHaveBeenCalledWith('User pasted nodes', {
				workflow_id: expect.any(String),
				node_graph_string: expect.any(String),
			});
		});

		it('should track duplicate telemetry when source is duplicate with trackEvents true', async () => {
			const telemetry = useTelemetry();
			const canvasOperations = useCanvasOperations();

			// Test 'duplicate' source
			await canvasOperations.importWorkflowData(workflowData, 'duplicate', { trackEvents: true });
			expect(telemetry.track).toHaveBeenCalledWith('User duplicated nodes', {
				workflow_id: expect.any(String),
				node_graph_string: expect.any(String),
			});
		});

		it('should track import telemetry when source is file with trackEvents true', async () => {
			const telemetry = useTelemetry();
			const canvasOperations = useCanvasOperations();

			// Test other source
			await canvasOperations.importWorkflowData(workflowData, 'file', { trackEvents: true });
			expect(telemetry.track).toHaveBeenCalledWith('User imported workflow', {
				source: 'file',
				workflow_id: expect.any(String),
				node_graph_string: expect.any(String),
			});
		});

		it('should not track any telemetry events when trackEvents is false regardless of source', async () => {
			const telemetry = useTelemetry();
			const canvasOperations = useCanvasOperations();

			// Test 'paste' source with trackEvents: false
			await canvasOperations.importWorkflowData(workflowData, 'paste', {
				trackEvents: false,
			});
			expect(telemetry.track).not.toHaveBeenCalledWith('User pasted nodes', expect.any(Object));

			// Test 'duplicate' source with trackEvents: false
			await canvasOperations.importWorkflowData(workflowData, 'duplicate', {
				trackEvents: false,
			});
			expect(telemetry.track).not.toHaveBeenCalledWith('User duplicated nodes', expect.any(Object));

			// Test other source with trackEvents: false
			await canvasOperations.importWorkflowData(workflowData, 'file', {
				trackEvents: false,
			});
			expect(telemetry.track).not.toHaveBeenCalledWith(
				'User imported workflow',
				expect.any(Object),
			);

			// Ensure no telemetry was called at all
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('should set workflow name when importing with name', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			// This mock is needed for addImportedNodesToWorkflow to work
			workflowsStore.createWorkflowObject = vi.fn().mockReturnValue({
				nodes: {},
				connections: {},
				connectionsBySourceNode: {},
				renameNode: vi.fn(),
			});

			const setWorkflowName = vi.spyOn(workflowState, 'setWorkflowName');

			const canvasOperations = useCanvasOperations();
			const workflowDataWithName = {
				name: 'Test Workflow Name',
				nodes: [],
				connections: {},
			};

			await canvasOperations.importWorkflowData(workflowDataWithName, 'file');

			expect(setWorkflowName).toHaveBeenCalledWith({
				newName: 'Test Workflow Name',
				setStateDirty: true,
			});
		});
	});

	describe('duplicateNodes', () => {
		it('should duplicate nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowsStore.setNodes(nodes);
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.createWorkflowObject.mockReturnValue(workflowObject);

			const canvasOperations = useCanvasOperations();
			const duplicatedNodeIds = await canvasOperations.duplicateNodes(['1', '2']);

			expect(duplicatedNodeIds.length).toBe(2);
			expect(duplicatedNodeIds).not.toContain('1');
			expect(duplicatedNodeIds).not.toContain('2');
		});

		it('should not crash when TelemetryHelpers.generateNodesGraph throws error', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const telemetry = useTelemetry();
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowsStore.setNodes(nodes);
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.createWorkflowObject.mockReturnValue(workflowObject);

			// Mock TelemetryHelpers.generateNodesGraph to throw an error for this test
			vi.mocked(TelemetryHelpers.generateNodesGraph).mockImplementationOnce(() => {
				throw new Error('Telemetry generation failed');
			});

			// This should not throw even when telemetry fails
			const canvasOperations = useCanvasOperations();
			await expect(canvasOperations.duplicateNodes(['1', '2'])).resolves.not.toThrow();

			// Telemetry should not be tracked when generation fails
			expect(telemetry.track).not.toHaveBeenCalledWith(
				'User imported workflow',
				expect.any(Object),
			);
		});
	});

	describe('importTemplate', () => {
		it('should import template to canvas', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProjectId = 'test-project-id';

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.convertTemplateNodeToNodeUi.mockImplementation((node) => ({
				...node,
				credentials: {},
			}));

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			// Create nodes: A -> B (no outgoing from B)
			const nodeA: IWorkflowTemplateNode = createTestNode({
				id: 'X',
				name: 'Node X',
				position: [80, 80],
			});
			const nodeB: IWorkflowTemplateNode = createTestNode({
				id: 'Y',
				name: 'Node Y',
				position: [192, 80],
			});

			const workflow: IWorkflowTemplate['workflow'] = {
				nodes: [nodeA, nodeB],
				connections: {
					[nodeA.name]: {
						main: [[{ node: nodeB.name, type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};

			const getNewWorkflowDataAndMakeShareable = vi.spyOn(
				workflowState,
				'getNewWorkflowDataAndMakeShareable',
			);

			const { importTemplate } = useCanvasOperations();

			const templateId = 'template-id';
			const templateName = 'template name';
			await importTemplate({
				id: templateId,
				name: templateName,
				workflow,
			});

			expect(workflowsStore.setConnections).toHaveBeenCalledWith(workflow.connections);
			expect(workflowsStore.addNode).toHaveBeenNthCalledWith(1, {
				...nodeA,
				credentials: {},
				disabled: false,
			});
			expect(workflowsStore.setNodePristine).toHaveBeenCalledWith(nodeA.name, true);
			expect(workflowsStore.addNode).toHaveBeenNthCalledWith(2, {
				...nodeB,
				credentials: {},
				disabled: false,
			});
			expect(workflowsStore.setNodePristine).toHaveBeenCalledWith(nodeB.name, true);
			expect(getNewWorkflowDataAndMakeShareable).toHaveBeenCalledWith(
				templateName,
				projectsStore.currentProjectId,
			);
			expect(workflowsStore.addToWorkflowMetadata).toHaveBeenCalledWith({
				templateId,
			});
		});
	});
	describe('replaceNodeParameters', () => {
		it('should replace node parameters and track history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);

			const nodeId = 'node1';
			const currentParameters = { param1: 'value1' };
			const newParameters = { param1: 'value2' };

			const node = createTestNode({
				id: nodeId,
				type: 'node',
				name: 'Node 1',
				parameters: currentParameters,
			});

			workflowsStore.getNodeById.mockReturnValue(node);
			workflowState.setNodeParameters = vi.fn();

			const { replaceNodeParameters } = useCanvasOperations();
			replaceNodeParameters(nodeId, currentParameters, newParameters, { trackHistory: true });

			expect(workflowState.setNodeParameters).toHaveBeenCalledWith({
				name: node.name,
				value: newParameters,
			});
			expect(historyStore.pushCommandToUndo).toHaveBeenCalledWith(
				new ReplaceNodeParametersCommand(
					nodeId,
					currentParameters,
					newParameters,
					expect.any(Number),
				),
			);
		});

		it('should replace node parameters without tracking history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);

			const nodeId = 'node1';
			const currentParameters = { param1: 'value1' };
			const newParameters = { param1: 'value2' };

			const node = createTestNode({
				id: nodeId,
				type: 'node',
				name: 'Node 1',
				parameters: currentParameters,
			});

			workflowsStore.getNodeById.mockReturnValue(node);
			workflowState.setNodeParameters = vi.fn();

			const { replaceNodeParameters } = useCanvasOperations();
			replaceNodeParameters(nodeId, currentParameters, newParameters, { trackHistory: false });

			expect(workflowState.setNodeParameters).toHaveBeenCalledWith({
				name: node.name,
				value: newParameters,
			});
			expect(historyStore.pushCommandToUndo).not.toHaveBeenCalled();
		});

		it('should not replace parameters if node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const nodeId = 'nonexistent';
			const currentParameters = { param1: 'value1' };
			const newParameters = { param1: 'value2' };

			workflowsStore.getNodeById.mockReturnValue(undefined);
			workflowState.setNodeParameters = vi.fn();

			const { replaceNodeParameters } = useCanvasOperations();
			replaceNodeParameters(nodeId, currentParameters, newParameters);

			expect(workflowState.setNodeParameters).not.toHaveBeenCalled();
		});

		it('should handle bulk tracking when replacing parameters for multiple nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);

			const nodeId1 = 'node1';
			const nodeId2 = 'node2';
			const currentParameters1 = { param1: 'value1' };
			const newParameters1 = { param1: 'value2' };
			const currentParameters2 = { param2: 'value3' };
			const newParameters2 = { param2: 'value4' };

			const node1 = createTestNode({
				id: nodeId1,
				type: 'node',
				name: 'Node 1',
				parameters: currentParameters1,
			});
			const node2 = createTestNode({
				id: nodeId2,
				type: 'node',
				name: 'Node 2',
				parameters: currentParameters2,
			});

			workflowState.setNodeParameters = vi.fn();
			workflowsStore.getNodeById.mockReturnValueOnce(node1).mockReturnValueOnce(node2);

			const { replaceNodeParameters } = useCanvasOperations();
			replaceNodeParameters(nodeId1, currentParameters1, newParameters1, {
				trackHistory: true,
				trackBulk: false,
			});
			replaceNodeParameters(nodeId2, currentParameters2, newParameters2, {
				trackHistory: true,
				trackBulk: false,
			});

			expect(historyStore.startRecordingUndo).not.toHaveBeenCalled();
			expect(historyStore.stopRecordingUndo).not.toHaveBeenCalled();
			expect(workflowState.setNodeParameters).toHaveBeenCalledTimes(2);
		});

		it('should revert replaced node parameters', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const nodeId = 'node1';
			const currentParameters = { param1: 'value1' };
			const newParameters = { param1: 'value2' };

			const node = createTestNode({
				id: nodeId,
				type: 'node',
				name: 'Node 1',
				parameters: newParameters,
			});

			workflowState.setNodeParameters = vi.fn();
			workflowsStore.getNodeById.mockReturnValue(node);

			const { revertReplaceNodeParameters } = useCanvasOperations();
			await revertReplaceNodeParameters(nodeId, currentParameters, newParameters);

			expect(workflowState.setNodeParameters).toHaveBeenCalledWith({
				name: node.name,
				value: currentParameters,
			});
		});
	});
	describe('replaceNodeConnections', () => {
		const sourceNode = createTestNode({ id: 'source', name: 'Source Node' });
		const targetNode = createTestNode({ id: 'target', name: 'Target Node' });
		const replacementNode = createTestNode({ id: 'replacement', name: 'Replacement Node' });
		const nextNode = createTestNode({ id: 'next', name: 'Next Node' });

		let historyStore: ReturnType<typeof mockedStore<typeof useHistoryStore>>;
		let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
		let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

		beforeEach(() => {
			historyStore = mockedStore(useHistoryStore);
			nodeTypesStore = mockedStore(useNodeTypesStore);
			workflowsStore = mockedStore(useWorkflowsStore);

			const nodeTypeDescription = mockNodeTypeDescription({
				inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
		});
		afterEach(() => {
			// Mock cleanup handled automatically by test isolation
		});

		describe('common cases', () => {
			beforeEach(() => {
				workflowsStore.workflow.nodes = [sourceNode, targetNode, replacementNode, nextNode];
				workflowsStore.workflow.connections = {
					[sourceNode.name]: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 },
								{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 1 },
							],
						],
					},
					[targetNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: nextNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};

				workflowsStore.getNodeById = vi.fn().mockImplementation((id) => {
					if (id === sourceNode.id) return sourceNode;
					if (id === targetNode.id) return targetNode;
					if (id === replacementNode.id) return replacementNode;
					if (id === nextNode.id) return nextNode;
					return undefined;
				});
				workflowsStore.getNodeByName = vi.fn().mockImplementation((name) => {
					if (name === sourceNode.name) return sourceNode;
					if (name === targetNode.name) return targetNode;
					if (name === replacementNode.name) return replacementNode;
					if (name === nextNode.name) return nextNode;
					return undefined;
				});
			});
			it('should replace connections for a node and track history', () => {
				const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
				workflowsStore.workflowObject = workflowObject;

				const { replaceNodeConnections } = useCanvasOperations();
				replaceNodeConnections(targetNode.id, replacementNode.id, { trackHistory: true });

				expect(workflowsStore.removeConnection).toHaveBeenCalledTimes(3);
				expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
					connection: [
						{
							index: 0,
							node: 'Source Node',
							type: NodeConnectionTypes.Main,
						},
						{
							index: 0,
							node: 'Target Node',
							type: NodeConnectionTypes.Main,
						},
					],
				});
				expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
					connection: [
						{
							index: 0,
							node: 'Source Node',
							type: NodeConnectionTypes.Main,
						},
						{
							index: 1,
							node: 'Target Node',
							type: NodeConnectionTypes.Main,
						},
					],
				});
				expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
					connection: [
						{
							index: 0,
							node: 'Target Node',
							type: NodeConnectionTypes.Main,
						},
						{
							index: 0,
							node: 'Next Node',
							type: NodeConnectionTypes.Main,
						},
					],
				});
				expect(workflowsStore.addConnection).toHaveBeenCalledTimes(3);
				expect(workflowsStore.addConnection).toHaveBeenCalledWith({
					connection: [
						{
							index: 0,
							node: 'Source Node',
							type: 'main',
						},
						{
							index: 0,
							node: 'Replacement Node',
							type: 'main',
						},
					],
				});
				expect(workflowsStore.addConnection).toHaveBeenCalledWith({
					connection: [
						{
							index: 0,
							node: 'Source Node',
							type: NodeConnectionTypes.Main,
						},
						{
							index: 1,
							node: 'Replacement Node',
							type: NodeConnectionTypes.Main,
						},
					],
				});
				expect(workflowsStore.addConnection).toHaveBeenCalledWith({
					connection: [
						{
							index: 0,
							node: 'Replacement Node',
							type: NodeConnectionTypes.Main,
						},
						{
							index: 0,
							node: 'Next Node',
							type: NodeConnectionTypes.Main,
						},
					],
				});

				expect(historyStore.startRecordingUndo).toHaveBeenCalled();
				expect(historyStore.stopRecordingUndo).toHaveBeenCalled();
			});

			it('should replace connections without tracking history', () => {
				const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
				workflowsStore.workflowObject = workflowObject;

				const { replaceNodeConnections } = useCanvasOperations();
				replaceNodeConnections(targetNode.id, replacementNode.id, { trackHistory: false });

				expect(workflowsStore.removeConnection).toHaveBeenCalled();
				expect(workflowsStore.addConnection).toHaveBeenCalled();
				expect(historyStore.startRecordingUndo).not.toHaveBeenCalled();
				expect(historyStore.stopRecordingUndo).not.toHaveBeenCalled();
			});

			it('should not replace connections if previous node does not exist', () => {
				const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
				workflowsStore.workflowObject = workflowObject;

				const { replaceNodeConnections } = useCanvasOperations();
				replaceNodeConnections('nonexistent', replacementNode.id);

				expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
				expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			});

			it('should not replace connections if new node does not exist', () => {
				const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
				workflowsStore.workflowObject = workflowObject;

				const { replaceNodeConnections } = useCanvasOperations();
				replaceNodeConnections(targetNode.id, 'nonexistent');

				expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
				expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			});

			it('should respect replaceInputs being false', () => {
				const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
				workflowsStore.workflowObject = workflowObject;

				const { replaceNodeConnections } = useCanvasOperations();
				// nextNode only has an input connection
				replaceNodeConnections(nextNode.id, replacementNode.id, {
					trackHistory: true,
					replaceInputs: false,
				});

				expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
				expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			});

			it('should respect replaceOutputs being false', () => {
				const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
				workflowsStore.workflowObject = workflowObject;

				const { replaceNodeConnections } = useCanvasOperations();
				// sourceNode only has an output connection
				replaceNodeConnections(sourceNode.id, replacementNode.id, {
					trackHistory: true,
					replaceOutputs: false,
				});

				expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
				expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			});
		});
		it('should handle bulk tracking when replacing connections for multiple nodes', () => {
			const previousNode1 = createTestNode({
				id: 'node1',
				name: 'Previous Node 1',
			});
			const newNode1 = createTestNode({
				id: 'node2',
				name: 'New Node 1',
			});
			const previousNode2 = createTestNode({
				id: 'node3',
				name: 'Previous Node 2',
			});
			const newNode2 = createTestNode({
				id: 'node4',
				name: 'New Node 2',
			});
			const targetNode = createTestNode({
				id: 'node5',
				name: 'Target Node',
			});

			workflowsStore.workflow.nodes = [
				previousNode1,
				previousNode2,
				newNode1,
				newNode2,
				targetNode,
			];
			workflowsStore.workflow.connections = {
				[previousNode1.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				[previousNode2.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: targetNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			workflowsStore.getNodeById = vi.fn().mockImplementation((id) => {
				if (id === previousNode1.id) return previousNode1;
				if (id === newNode1.id) return newNode1;
				if (id === previousNode2.id) return previousNode1;
				if (id === newNode2.id) return newNode2;
				if (id === targetNode.id) return targetNode;

				return undefined;
			});
			workflowsStore.getNodeByName = vi.fn().mockImplementation((name) => {
				if (name === previousNode1.name) return previousNode1;
				if (name === newNode1.name) return newNode1;
				if (name === previousNode2.name) return previousNode1;
				if (name === newNode2.name) return newNode2;
				if (name === targetNode.name) return targetNode;
				return undefined;
			});

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			const { replaceNodeConnections } = useCanvasOperations();
			replaceNodeConnections(previousNode1.id, newNode1.id, {
				trackHistory: true,
				trackBulk: false,
			});
			replaceNodeConnections(previousNode2.id, newNode2.id, {
				trackHistory: true,
				trackBulk: false,
			});

			expect(historyStore.startRecordingUndo).not.toHaveBeenCalled();
			expect(historyStore.stopRecordingUndo).not.toHaveBeenCalled();
			expect(workflowsStore.removeConnection).toHaveBeenCalledTimes(2);
			expect(workflowsStore.addConnection).toHaveBeenCalledTimes(2);
		});
	});
	describe('replaceNode', () => {
		const sourceNode = createTestNode({ id: 'source', name: 'Source Node' });
		const targetNode = createTestNode({ id: 'target', name: 'Target Node' });
		const replacementNode = createTestNode({
			id: 'replacement',
			name: 'Replacement Node',
		});
		const nextNode = createTestNode({ id: 'next', name: 'Next Node' });
		const connectionSourceMain0 = {
			node: sourceNode.name,
			type: NodeConnectionTypes.Main,
			index: 0,
		};
		const connectionSourceMain1 = {
			node: sourceNode.name,
			type: NodeConnectionTypes.Main,
			index: 1,
		};
		const connectionTargetMain0 = {
			node: targetNode.name,
			type: NodeConnectionTypes.Main,
			index: 0,
		};
		const connectionTargetMain1 = {
			node: targetNode.name,
			type: NodeConnectionTypes.Main,
			index: 1,
		};
		const connectionReplacementMain0 = {
			node: replacementNode.name,
			type: NodeConnectionTypes.Main,
			index: 0,
		};
		const connectionReplacementMain1 = {
			node: replacementNode.name,
			type: NodeConnectionTypes.Main,
			index: 1,
		};

		const connectionNextMain0 = {
			node: nextNode.name,
			type: NodeConnectionTypes.Main,
			index: 0,
		};

		let historyStore: ReturnType<typeof mockedStore<typeof useHistoryStore>>;
		let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
		let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

		beforeEach(() => {
			historyStore = mockedStore(useHistoryStore);
			nodeTypesStore = mockedStore(useNodeTypesStore);
			workflowsStore = mockedStore(useWorkflowsStore);

			const nodeTypeDescription = mockNodeTypeDescription({
				inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
		});
		afterEach(() => {
			// Mock cleanup handled automatically by test isolation
		});

		describe('common cases', () => {
			beforeEach(() => {
				workflowsStore.workflow.nodes = [sourceNode, targetNode, replacementNode, nextNode];
				workflowsStore.workflow.connections = {
					[sourceNode.name]: {
						[NodeConnectionTypes.Main]: [[connectionTargetMain0], [connectionTargetMain1]],
					},
					[targetNode.name]: {
						[NodeConnectionTypes.Main]: [[connectionNextMain0]],
					},
				};

				workflowsStore.getNodeById = vi.fn().mockImplementation((id) => {
					if (id === sourceNode.id) return sourceNode;
					if (id === targetNode.id) return targetNode;
					if (id === replacementNode.id) return replacementNode;
					if (id === nextNode.id) return nextNode;
					return undefined;
				});
				workflowsStore.getNodeByName = vi.fn().mockImplementation((name) => {
					if (name === sourceNode.name) return sourceNode;
					if (name === targetNode.name) return targetNode;
					if (name === replacementNode.name) return replacementNode;
					if (name === nextNode.name) return nextNode;
					return undefined;
				});
				workflowsStore.incomingConnectionsByNodeName = vi.fn().mockImplementation((name) => {
					if (name === sourceNode.name) return {};
					if (name === targetNode.name)
						return {
							[NodeConnectionTypes.Main]: [[connectionSourceMain0], [connectionSourceMain1]],
						};
					if (name === nextNode.name)
						return {
							[NodeConnectionTypes.Main]: [[connectionTargetMain0]],
						};

					return {};
				});
				workflowsStore.outgoingConnectionsByNodeName = vi.fn().mockImplementation((name) => {
					if (name === sourceNode.name)
						return {
							[NodeConnectionTypes.Main]: [[connectionTargetMain0], [connectionTargetMain1]],
						};
					if (name === targetNode.name)
						return {
							[NodeConnectionTypes.Main]: [[connectionNextMain0]],
						};
					if (name === nextNode.name) return {};

					return undefined;
				});
			});
			it('should replace an existing node and track history', () => {
				const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
				workflowsStore.workflowObject = workflowObject;

				const { replaceNode } = useCanvasOperations();
				replaceNode(targetNode.id, replacementNode.id, { trackHistory: true });

				expect(workflowsStore.removeConnection).toHaveBeenCalledTimes(6);
				// These are called twice with the same input, once for input connections, once for output connections
				expect(workflowsStore.removeConnection).toHaveBeenNthCalledWith(1, {
					connection: [connectionSourceMain0, connectionTargetMain0],
				});
				expect(workflowsStore.removeConnection).toHaveBeenNthCalledWith(2, {
					connection: [connectionSourceMain1, connectionTargetMain1],
				});
				expect(workflowsStore.removeConnection).toHaveBeenNthCalledWith(3, {
					connection: [connectionTargetMain0, connectionNextMain0],
				});
				expect(workflowsStore.removeConnection).toHaveBeenNthCalledWith(4, {
					connection: [connectionSourceMain0, connectionTargetMain0],
				});
				expect(workflowsStore.removeConnection).toHaveBeenNthCalledWith(5, {
					connection: [connectionSourceMain1, connectionTargetMain1],
				});
				expect(workflowsStore.removeConnection).toHaveBeenNthCalledWith(6, {
					connection: [connectionTargetMain0, connectionNextMain0],
				});
				expect(workflowsStore.addConnection).toHaveBeenCalledTimes(4);
				expect(workflowsStore.addConnection).toHaveBeenCalledWith({
					connection: [connectionSourceMain0, connectionReplacementMain0],
				});
				expect(workflowsStore.addConnection).toHaveBeenCalledWith({
					connection: [connectionSourceMain1, connectionReplacementMain1],
				});
				expect(workflowsStore.addConnection).toHaveBeenCalledWith({
					connection: [connectionReplacementMain0, connectionNextMain0],
				});
				expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(targetNode.id);

				expect(historyStore.startRecordingUndo).toHaveBeenCalled();
				expect(historyStore.stopRecordingUndo).toHaveBeenCalled();
			});
		});
		it('should not track history if flag is false', () => {
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;

			const { replaceNode } = useCanvasOperations();
			replaceNode(targetNode.id, replacementNode.id, { trackHistory: false });

			expect(historyStore.startRecordingUndo).not.toHaveBeenCalled();
			expect(historyStore.stopRecordingUndo).not.toHaveBeenCalled();
		});
	});
	describe('openWorkflowTemplate', () => {
		let templatesStore: ReturnType<typeof mockedStore<typeof useTemplatesStore>>;
		let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

		beforeEach(() => {
			templatesStore = mockedStore(useTemplatesStore);
			projectsStore = mockedStore(useProjectsStore);

			projectsStore.currentProjectId = 'test-project-id';
		});

		it('should open workflow template', async () => {
			const router = useRouter();
			const telemetry = useTelemetry();

			templatesStore.getFixedWorkflowTemplate = vi.fn().mockReturnValue({
				id: 'workflow-id',
				name: 'Template Name',
				workflow: { nodes: [], connections: {} },
			});

			const getNewWorkflowDataAndMakeShareable = vi.spyOn(
				workflowState,
				'getNewWorkflowDataAndMakeShareable',
			);

			const { openWorkflowTemplate } = useCanvasOperations();
			await openWorkflowTemplate('template-id');

			expect(templatesStore.getFixedWorkflowTemplate).toHaveBeenCalledWith('template-id');
			expect(getNewWorkflowDataAndMakeShareable).toHaveBeenCalledWith(
				'Template Name',
				'test-project-id',
			);

			expect(telemetry.track).toHaveBeenCalledWith('User inserted workflow template', {
				source: 'workflow',
				template_id: 'template-id',
				wf_template_repo_session_id: '',
			});
			expect(router.replace).toHaveBeenCalledWith({
				name: VIEWS.NEW_WORKFLOW,
				query: { templateId: 'template-id' },
			});
		});
	});

	describe('openWorkflowTempalateFromJSON', () => {
		let router: ReturnType<typeof useRouter>;
		let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

		beforeEach(() => {
			router = useRouter();
			projectsStore = mockedStore(useProjectsStore);

			projectsStore.currentProjectId = 'test-project-id';
		});

		it('should open workflow template from JSON', async () => {
			const template: WorkflowDataWithTemplateId = {
				id: 'workflow-id',
				name: 'Template Name',
				nodes: [],
				connections: {},
				meta: { templateId: 'template-id' },
			};

			const getNewWorkflowDataAndMakeShareable = vi.spyOn(
				workflowState,
				'getNewWorkflowDataAndMakeShareable',
			);

			const { openWorkflowTemplateFromJSON } = useCanvasOperations();
			await openWorkflowTemplateFromJSON(template);

			expect(getNewWorkflowDataAndMakeShareable).toHaveBeenCalledWith(
				'Template Name',
				'test-project-id',
			);

			expect(router.replace).toHaveBeenCalledWith({
				name: VIEWS.NEW_WORKFLOW,
				query: {
					templateId: 'template-id',
					projectId: 'test-project-id',
					parentFolderId: undefined,
				},
			});
		});
	});
});

function buildImportNodes() {
	return [
		mockNode({ id: '1', name: 'Node 1', type: SET_NODE_TYPE }),
		mockNode({ id: '2', name: 'Node 2', type: SET_NODE_TYPE }),
	].map((node) => {
		// Setting position in mockNode will wrap it in a Proxy
		// This causes deepCopy to remove position -> set position after instead
		node.position = [40, 40];
		return node;
	});
}
