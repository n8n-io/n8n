import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed, effectScope, nextTick } from 'vue';
import { mapConnections, useWorkflowDiff } from './useWorkflowDiff';
import type { CanvasConnection, CanvasNode } from '@/features/workflows/canvas/canvas.types';
import type { ExecutionOutputMap } from '@/app/types/executionData';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { NodeDiffStatus, type IConnections } from 'n8n-workflow';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';
import { createNodeExecutionSnapshot } from '@/features/workflows/canvas/__tests__/utils';
import { disposeWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { disposeWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

// Mock modules at top level
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowId: 'test-workflow',
	}),
}));

const mockDocumentStore = vi.hoisted(() => ({
	hydrate: vi.fn(),
	render: {
		nodeInputsByNodeId: new Map(),
		nodeOutputsByNodeId: new Map(),
		pinnedDataByNodeName: {},
		executionIssuesByNodeName: new Map(),
	},
	$id: 'test-store',
	$dispose: vi.fn(),
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStore,
	createWorkflowDocumentId: vi.fn(
		(workflowId: string, version: string = 'latest') => `${workflowId}@${version}`,
	),
	disposeWorkflowDocumentStore: vi.fn(),
}));

vi.mock('@/app/stores/workflowDocument/useWorkflowDocumentRenderData', async () => {
	const { createEmptyCanvasRenderData } = await vi.importActual<
		typeof import('@/features/workflows/canvas/canvas.utils')
	>('@/features/workflows/canvas/canvas.utils');
	return {
		useWorkflowDocumentRenderData: vi.fn(() => createEmptyCanvasRenderData()),
	};
});

vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: vi.fn((id: string) => ({
		$id: id,
		activeExecutionIssuesByNodeName: new Map(),
	})),
	disposeWorkflowExecutionStateStore: vi.fn(),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: vi.fn().mockReturnValue({
			name: 'Test Node Type',
			version: 1,
		}),
	}),
}));

vi.mock('@/features/workflows/canvas/composables/useCanvasMapping', () => ({
	useCanvasMapping: vi.fn().mockReturnValue({
		additionalNodePropertiesById: computed(() => ({})),
		nodeExecutionRunDataOutputMapById: computed(() => ({})),
		nodeExecutionWaitingForNextById: computed(() => ({})),
		nodeHasIssuesById: computed(() => ({})),
		nodeDisplaySizeById: computed(() => ({})),
		nodes: computed(() => []),
		connections: computed(() => []),
	}),
}));

describe('useWorkflowDiff', () => {
	describe('mapConnections', () => {
		const createTestConnection = (
			id: string,
			overrides: Partial<CanvasConnection> = {},
		): CanvasConnection => ({
			id,
			source: `source-${id}`,
			target: `target-${id}`,
			sourceHandle: `source-handle-${id}`,
			targetHandle: `target-handle-${id}`,
			...overrides,
		});

		it('should map connections correctly', () => {
			const connections = [
				createTestConnection('conn1'),
				createTestConnection('conn2'),
				createTestConnection('conn3'),
			];

			const result = mapConnections(connections);

			expect(result.set.size).toBe(3);
			expect(result.map.size).toBe(3);
			expect(result.set.has('conn1')).toBe(true);
			expect(result.set.has('conn2')).toBe(true);
			expect(result.set.has('conn3')).toBe(true);
			expect(result.map.get('conn1')).toEqual(connections[0]);
			expect(result.map.get('conn2')).toEqual(connections[1]);
			expect(result.map.get('conn3')).toEqual(connections[2]);
		});

		it('should handle empty connections array', () => {
			const connections: CanvasConnection[] = [];

			const result = mapConnections(connections);

			expect(result.set.size).toBe(0);
			expect(result.map.size).toBe(0);
		});

		it('should handle single connection', () => {
			const connections = [createTestConnection('single')];

			const result = mapConnections(connections);

			expect(result.set.size).toBe(1);
			expect(result.map.size).toBe(1);
			expect(result.set.has('single')).toBe(true);
			expect(result.map.get('single')).toEqual(connections[0]);
		});

		it('should handle connections with same id (overwrite)', () => {
			const connections = [
				createTestConnection('duplicate', { source: 'source1' }),
				createTestConnection('duplicate', { source: 'source2' }),
			];

			const result = mapConnections(connections);

			expect(result.set.size).toBe(1);
			expect(result.map.size).toBe(1);
			expect(result.set.has('duplicate')).toBe(true);
			expect(result.map.get('duplicate')?.source).toBe('source2');
		});

		it('should maintain connection properties', () => {
			const connection = createTestConnection('test', {
				source: 'node1',
				target: 'node2',
				sourceHandle: 'output',
				targetHandle: 'input',
			});

			const result = mapConnections([connection]);

			const mappedConnection = result.map.get('test');
			expect(mappedConnection?.source).toBe('node1');
			expect(mappedConnection?.target).toBe('node2');
			expect(mappedConnection?.sourceHandle).toBe('output');
			expect(mappedConnection?.targetHandle).toBe('input');
		});
	});

	describe('useWorkflowDiff composable', () => {
		const mockUseCanvasMapping = vi.mocked(useCanvasMapping);

		const createMockCanvasMappingReturn = (
			nodes: Array<Partial<CanvasNode>> = [],
			connections: Array<Partial<CanvasConnection>> = [],
		) => ({
			additionalNodePropertiesById: computed(() => ({}) as Record<string, Partial<CanvasNode>>),
			nodeExecutionRunDataOutputMapById: computed(() => ({}) as Record<string, ExecutionOutputMap>),
			nodeExecutionWaitingForNextById: computed(() => ({}) as Record<string, boolean>),
			nodeHasIssuesById: computed(() => ({}) as Record<string, boolean>),
			nodeDisplaySizeById: computed(
				() => ({}) as Record<string, { width: number; height: number }>,
			),
			getNodeExecutionSnapshot: () => createNodeExecutionSnapshot(),
			nodes: computed(() => nodes as CanvasNode[]),
			connections: computed(() => connections as CanvasConnection[]),
		});

		beforeEach(() => {
			vi.clearAllMocks();
			mockUseCanvasMapping.mockReturnValue(createMockCanvasMappingReturn());
		});

		const createMockWorkflow = (
			id: string,
			nodes: INodeUi[] = [],
			connections: IConnections = {},
		): IWorkflowDb => ({
			id,
			name: `Workflow ${id}`,
			nodes,
			connections,
			active: false,
			activeVersionId: null,
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
			tags: [],
			pinData: {},
			settings: {
				executionOrder: 'v1',
			},
			versionId: 'version-1',
			isArchived: false,
		});

		const createMockNode = (id: string, overrides: Partial<INodeUi> = {}): INodeUi => ({
			id,
			name: `Node ${id}`,
			type: 'test-node',
			typeVersion: 1,
			position: [100, 100],
			parameters: {},
			...overrides,
		});

		const createMockCanvasConnection = (
			id: string,
			overrides: Partial<CanvasConnection> = {},
		): CanvasConnection => ({
			id,
			source: `node-${id}-source`,
			target: `node-${id}-target`,
			sourceHandle: 'main',
			targetHandle: 'main',
			...overrides,
		});

		it('should initialize with default values when no workflows provided', () => {
			const { source, target, nodesDiff, connectionsDiff } = useWorkflowDiff(undefined, undefined);

			expect(source.value.workflow).toBeUndefined();
			expect(source.value.nodes).toEqual([]);
			expect(source.value.connections).toEqual([]);
			expect(target.value.workflow).toBeUndefined();
			expect(target.value.nodes).toEqual([]);
			expect(target.value.connections).toEqual([]);
			expect(nodesDiff.value.size).toBe(0);
			expect(connectionsDiff.value.size).toBe(0);
		});

		it('should handle source workflow only', () => {
			const sourceWorkflow = createMockWorkflow('source', [createMockNode('node1')]);
			mockUseCanvasMapping.mockReturnValue(createMockCanvasMappingReturn([{ id: 'canvas-node1' }]));

			const { source, target } = useWorkflowDiff(sourceWorkflow, undefined);

			expect(source.value.workflow?.value).toEqual(sourceWorkflow);
			expect(source.value.nodes).toHaveLength(1);
			expect(source.value.nodes[0]).toEqual(
				expect.objectContaining({
					id: 'canvas-node1',
					draggable: false,
					selectable: false,
					focusable: false,
				}),
			);
			expect(target.value.workflow).toBeUndefined();
		});

		it('should handle target workflow only', () => {
			const targetWorkflow = createMockWorkflow('target', [createMockNode('node1')]);
			mockUseCanvasMapping.mockReturnValue(createMockCanvasMappingReturn([{ id: 'canvas-node1' }]));

			const { source, target } = useWorkflowDiff(undefined, targetWorkflow);

			expect(source.value.workflow).toBeUndefined();
			expect(target.value.workflow?.value).toEqual(targetWorkflow);
			expect(target.value.nodes).toHaveLength(1);
			expect(target.value.nodes[0]).toEqual(
				expect.objectContaining({
					id: 'canvas-node1',
					draggable: false,
					selectable: false,
					focusable: false,
				}),
			);
		});

		it('should set canvas nodes as non-interactive', () => {
			const sourceWorkflow = createMockWorkflow('source');
			const mockCanvasNode = {
				id: 'node1',
				draggable: true,
				selectable: true,
				focusable: true,
			};

			mockUseCanvasMapping.mockReturnValue(createMockCanvasMappingReturn([mockCanvasNode]));

			const { source } = useWorkflowDiff(sourceWorkflow, undefined);

			expect(source.value.nodes[0]).toEqual(
				expect.objectContaining({
					draggable: false,
					selectable: false,
					focusable: false,
				}),
			);
		});

		it('should set canvas connections as non-interactive', () => {
			const sourceWorkflow = createMockWorkflow('source');
			const mockCanvasConnection = {
				id: 'conn1',
				selectable: true,
				focusable: true,
				source: 'node1',
				target: 'node2',
			};

			mockUseCanvasMapping.mockReturnValue(
				createMockCanvasMappingReturn([], [mockCanvasConnection]),
			);

			const { source } = useWorkflowDiff(sourceWorkflow, undefined);

			expect(source.value.connections[0]).toEqual(
				expect.objectContaining({
					selectable: false,
					focusable: false,
				}),
			);
		});

		it('should compute nodesDiff correctly', () => {
			const sourceNode = createMockNode('node1', { name: 'Source Node' });
			const targetNode = createMockNode('node1', { name: 'Target Node' });
			const sourceWorkflow = createMockWorkflow('source', [sourceNode]);
			const targetWorkflow = createMockWorkflow('target', [targetNode]);

			const { nodesDiff } = useWorkflowDiff(sourceWorkflow, targetWorkflow);

			expect(nodesDiff.value.size).toBe(1);
			expect(nodesDiff.value.get('node1')?.status).toBe(NodeDiffStatus.Modified);
		});

		it('should handle workflows with different nodes', () => {
			const sourceNodes = [createMockNode('node1'), createMockNode('node2')];
			const targetNodes = [createMockNode('node1'), createMockNode('node3')];
			const sourceWorkflow = createMockWorkflow('source', sourceNodes);
			const targetWorkflow = createMockWorkflow('target', targetNodes);

			const { nodesDiff } = useWorkflowDiff(sourceWorkflow, targetWorkflow);

			expect(nodesDiff.value.size).toBe(3);
			expect(nodesDiff.value.get('node1')?.status).toBe(NodeDiffStatus.Eq);
			expect(nodesDiff.value.get('node2')?.status).toBe(NodeDiffStatus.Deleted);
			expect(nodesDiff.value.get('node3')?.status).toBe(NodeDiffStatus.Added);
		});

		it('should compute connectionsDiff correctly', () => {
			const sourceConnections = [createMockCanvasConnection('conn1')];
			const targetConnections = [
				createMockCanvasConnection('conn1'),
				createMockCanvasConnection('conn2'),
			];

			const sourceWorkflow = createMockWorkflow('source');
			const targetWorkflow = createMockWorkflow('target');

			mockUseCanvasMapping
				.mockReturnValueOnce(createMockCanvasMappingReturn([], sourceConnections))
				.mockReturnValueOnce(createMockCanvasMappingReturn([], targetConnections));

			const { connectionsDiff } = useWorkflowDiff(sourceWorkflow, targetWorkflow);

			expect(connectionsDiff.value.size).toBe(1);
			expect(connectionsDiff.value.get('conn2')?.status).toBe(NodeDiffStatus.Added);
		});

		it('should handle reactive workflow updates', () => {
			const sourceWorkflowRef = ref<IWorkflowDb | undefined>(undefined);
			const { source } = useWorkflowDiff(sourceWorkflowRef, undefined);

			expect(source.value.workflow).toBeUndefined();

			const newWorkflow = createMockWorkflow('new-source');
			sourceWorkflowRef.value = newWorkflow;

			expect(source.value.workflow?.value).toEqual(newWorkflow);
		});

		it('should include node type information in connectionsDiff', () => {
			const sourceNode = createMockNode('node1', { type: 'http-request', typeVersion: 2 });
			const targetNode = createMockNode('node2', { type: 'webhook', typeVersion: 1 });

			const sourceWorkflow = createMockWorkflow('source', [sourceNode, targetNode]);
			const targetWorkflow = createMockWorkflow('target', [sourceNode, targetNode]);

			const connection = createMockCanvasConnection('conn1', {
				source: 'node1',
				target: 'node2',
			});

			mockUseCanvasMapping
				.mockReturnValueOnce(createMockCanvasMappingReturn())
				.mockReturnValueOnce(createMockCanvasMappingReturn([], [connection]));

			const { connectionsDiff } = useWorkflowDiff(sourceWorkflow, targetWorkflow);

			// Just verify that the connection diff was computed
			const connectionDiff = connectionsDiff.value.get('conn1');
			expect(connectionDiff?.status).toBe(NodeDiffStatus.Added);
			expect(connectionDiff?.connection).toBeDefined();
			expect(connectionDiff?.connection.id).toBe('conn1');
		});

		it('should generate IDs for nodes that are missing them', () => {
			const nodeWithoutId = {
				name: 'Node Without ID',
				type: 'test-node',
				typeVersion: 1,
				position: [100, 100] as [number, number],
				parameters: {},
			} as INodeUi;

			const nodeWithId = createMockNode('existing-id');

			const sourceWorkflow = createMockWorkflow('source', [nodeWithoutId, nodeWithId]);

			useWorkflowDiff(sourceWorkflow, undefined);

			// Verify useCanvasMapping was called with nodes that have IDs
			const firstCall = mockUseCanvasMapping.mock.calls[0][0];
			const passedNodes = firstCall.nodes.value;

			expect(passedNodes).toHaveLength(2);
			// Node without ID should now have a generated UUID
			expect(passedNodes[0].id).toBeDefined();
			expect(passedNodes[0].id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
			expect(passedNodes[0].name).toBe('Node Without ID');
			// Node with existing ID should keep its ID
			expect(passedNodes[1].id).toBe('existing-id');
		});

		it('hydrates the render-data store with the same node IDs used for canvas mapping', () => {
			const nodeWithoutId = {
				name: 'Node Without ID',
				type: 'test-node',
				typeVersion: 1,
				position: [100, 100] as [number, number],
				parameters: {},
			} as INodeUi;

			const sourceWorkflow = createMockWorkflow('source', [nodeWithoutId]);

			useWorkflowDiff(sourceWorkflow, undefined);

			// Canvas mapping receives nodes with generated IDs; the render-data store
			// must be hydrated with those same IDs, otherwise canvas lookups
			// (handles, render type, subtitle, status) miss.
			const canvasNodes = mockUseCanvasMapping.mock.calls[0][0].nodes.value;
			const hydratedNodes = mockDocumentStore.hydrate.mock.calls[0][0].nodes;

			expect(canvasNodes[0].id).toBeDefined();
			expect(hydratedNodes[0].id).toBe(canvasNodes[0].id);
		});

		it('disposes the execution-state store of the previous document when the diffed workflow changes', async () => {
			const sourceWorkflowRef = ref<IWorkflowDb | undefined>(createMockWorkflow('source'));

			useWorkflowDiff(sourceWorkflowRef, undefined);

			expect(disposeWorkflowExecutionStateStore).not.toHaveBeenCalled();

			sourceWorkflowRef.value = { ...createMockWorkflow('source'), versionId: 'version-2' };
			await nextTick();

			expect(disposeWorkflowExecutionStateStore).toHaveBeenCalledTimes(1);
			expect(disposeWorkflowExecutionStateStore).toHaveBeenCalledWith(
				expect.objectContaining({ $id: 'source@version-1' }),
			);
		});

		it('disposes the execution-state stores of both sides on dispose', () => {
			const scope = effectScope();
			scope.run(() => {
				useWorkflowDiff(createMockWorkflow('source'), createMockWorkflow('target'));
			});

			expect(disposeWorkflowExecutionStateStore).not.toHaveBeenCalled();

			scope.stop();

			expect(disposeWorkflowExecutionStateStore).toHaveBeenCalledTimes(2);
			expect(disposeWorkflowExecutionStateStore).toHaveBeenCalledWith(
				expect.objectContaining({ $id: 'source@version-1' }),
			);
			expect(disposeWorkflowExecutionStateStore).toHaveBeenCalledWith(
				expect.objectContaining({ $id: 'target@version-1' }),
			);
			expect(disposeWorkflowDocumentStore).toHaveBeenCalledTimes(2);
		});

		it('disposes the execution-state store before recreating it when a versionless document id is reused', async () => {
			const versionlessWorkflow = {
				...createMockWorkflow('source'),
				versionId: undefined,
			} as unknown as IWorkflowDb;
			const sourceWorkflowRef = ref<IWorkflowDb | undefined>(versionlessWorkflow);

			useWorkflowDiff(sourceWorkflowRef, undefined);

			sourceWorkflowRef.value = { ...versionlessWorkflow, name: 'Updated Workflow' };
			await nextTick();

			// Without a versionId both renders share the `source@diff-source` document id;
			// the stale execution-state store must be disposed, not resurrected.
			expect(disposeWorkflowExecutionStateStore).toHaveBeenCalledTimes(1);
			expect(disposeWorkflowExecutionStateStore).toHaveBeenCalledWith(
				expect.objectContaining({ $id: 'source@diff-source' }),
			);
		});
	});
});
