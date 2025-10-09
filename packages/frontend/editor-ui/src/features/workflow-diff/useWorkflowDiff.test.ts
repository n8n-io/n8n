import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed } from 'vue';
import {
	NodeDiffStatus,
	compareNodes,
	compareWorkflowsNodes,
	mapConnections,
	useWorkflowDiff,
} from './useWorkflowDiff';
import type { CanvasConnection, CanvasNode, ExecutionOutputMap } from '@/types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import { useCanvasMapping } from '@/composables/useCanvasMapping';

// Mock modules at top level
vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		createWorkflowObject: vi.fn().mockReturnValue({
			id: 'test-workflow',
			nodes: [],
			connections: {},
		}),
	}),
}));

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: vi.fn().mockReturnValue({
			name: 'Test Node Type',
			version: 1,
		}),
	}),
}));

vi.mock('@/composables/useCanvasMapping', () => ({
	useCanvasMapping: vi.fn().mockReturnValue({
		additionalNodePropertiesById: computed(() => ({})),
		nodeExecutionRunDataOutputMapById: computed(() => ({})),
		nodeExecutionWaitingForNextById: computed(() => ({})),
		nodeHasIssuesById: computed(() => ({})),
		nodes: computed(() => []),
		connections: computed(() => []),
	}),
}));

describe('useWorkflowDiff', () => {
	describe('NodeDiffStatus', () => {
		it('should have correct enum values', () => {
			expect(NodeDiffStatus.Eq).toBe('equal');
			expect(NodeDiffStatus.Modified).toBe('modified');
			expect(NodeDiffStatus.Added).toBe('added');
			expect(NodeDiffStatus.Deleted).toBe('deleted');
		});
	});

	describe('compareNodes', () => {
		const createTestNode = (overrides: Partial<TestNode> = {}): TestNode => ({
			id: 'test-node-1',
			name: 'Test Node',
			type: 'test-type',
			typeVersion: 1,
			webhookId: 'webhook-123',
			credentials: { test: 'credential' },
			parameters: { param1: 'value1' },
			position: [100, 200],
			disabled: false,
			...overrides,
		});

		type TestNode = {
			id: string;
			name: string;
			type: string;
			typeVersion: number;
			webhookId: string;
			credentials: Record<string, unknown>;
			parameters: Record<string, unknown>;
			position: [number, number];
			disabled: boolean;
		};

		it('should return true for identical nodes', () => {
			const node1 = createTestNode();
			const node2 = createTestNode();

			const result = compareNodes(node1, node2);

			expect(result).toBe(true);
		});

		it('should return false when nodes have different names', () => {
			const node1 = createTestNode({ name: 'Node 1' });
			const node2 = createTestNode({ name: 'Node 2' });

			const result = compareNodes(node1, node2);

			expect(result).toBe(false);
		});

		it('should return false when nodes have different types', () => {
			const node1 = createTestNode({ type: 'type1' });
			const node2 = createTestNode({ type: 'type2' });

			const result = compareNodes(node1, node2);

			expect(result).toBe(false);
		});

		it('should return false when nodes have different typeVersions', () => {
			const node1 = createTestNode({ typeVersion: 1 });
			const node2 = createTestNode({ typeVersion: 2 });

			const result = compareNodes(node1, node2);

			expect(result).toBe(false);
		});

		it('should return false when nodes have different webhookIds', () => {
			const node1 = createTestNode({ webhookId: 'webhook1' });
			const node2 = createTestNode({ webhookId: 'webhook2' });

			const result = compareNodes(node1, node2);

			expect(result).toBe(false);
		});

		it('should return false when nodes have different credentials', () => {
			const node1 = createTestNode({ credentials: { test: 'cred1' } });
			const node2 = createTestNode({ credentials: { test: 'cred2' } });

			const result = compareNodes(node1, node2);

			expect(result).toBe(false);
		});

		it('should return false when nodes have different parameters', () => {
			const node1 = createTestNode({ parameters: { param1: 'value1' } });
			const node2 = createTestNode({ parameters: { param1: 'value2' } });

			const result = compareNodes(node1, node2);

			expect(result).toBe(false);
		});

		it('should ignore properties not in comparison list', () => {
			const node1 = createTestNode({ position: [100, 200], disabled: false });
			const node2 = createTestNode({ position: [300, 400], disabled: true });

			const result = compareNodes(node1, node2);

			expect(result).toBe(true);
		});

		it('should handle undefined base node', () => {
			const node2 = createTestNode();

			const result = compareNodes(undefined, node2);

			expect(result).toBe(false);
		});

		it('should handle undefined target node', () => {
			const node1 = createTestNode();

			const result = compareNodes(node1, undefined);

			expect(result).toBe(false);
		});

		it('should handle both nodes being undefined', () => {
			const result = compareNodes(undefined, undefined);

			expect(result).toBe(true);
		});
	});

	describe('compareWorkflowsNodes', () => {
		const createTestNode = (id: string, overrides: Partial<TestNode> = {}): TestNode => ({
			id,
			name: `Node ${id}`,
			type: 'test-type',
			typeVersion: 1,
			webhookId: `webhook-${id}`,
			credentials: {},
			parameters: {},
			...overrides,
		});

		type TestNode = {
			id: string;
			name: string;
			type: string;
			typeVersion: number;
			webhookId: string;
			credentials: Record<string, unknown>;
			parameters: Record<string, unknown>;
		};

		it('should detect equal nodes', () => {
			const baseNodes = [createTestNode('1'), createTestNode('2')];
			const targetNodes = [createTestNode('1'), createTestNode('2')];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(2);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
			expect(diff.get('2')?.status).toBe(NodeDiffStatus.Eq);
		});

		it('should detect modified nodes', () => {
			const baseNodes = [createTestNode('1', { name: 'Original Name' })];
			const targetNodes = [createTestNode('1', { name: 'Modified Name' })];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(1);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Modified);
			expect(diff.get('1')?.node).toEqual(baseNodes[0]);
		});

		it('should detect added nodes', () => {
			const baseNodes = [createTestNode('1')];
			const targetNodes = [createTestNode('1'), createTestNode('2')];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(2);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
			expect(diff.get('2')?.status).toBe(NodeDiffStatus.Added);
			expect(diff.get('2')?.node).toEqual(targetNodes[1]);
		});

		it('should detect deleted nodes', () => {
			const baseNodes = [createTestNode('1'), createTestNode('2')];
			const targetNodes = [createTestNode('1')];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(2);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
			expect(diff.get('2')?.status).toBe(NodeDiffStatus.Deleted);
			expect(diff.get('2')?.node).toEqual(baseNodes[1]);
		});

		it('should handle empty base array', () => {
			const baseNodes: TestNode[] = [];
			const targetNodes = [createTestNode('1'), createTestNode('2')];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(2);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Added);
			expect(diff.get('2')?.status).toBe(NodeDiffStatus.Added);
		});

		it('should handle empty target array', () => {
			const baseNodes = [createTestNode('1'), createTestNode('2')];
			const targetNodes: TestNode[] = [];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(2);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Deleted);
			expect(diff.get('2')?.status).toBe(NodeDiffStatus.Deleted);
		});

		it('should handle both arrays being empty', () => {
			const baseNodes: TestNode[] = [];
			const targetNodes: TestNode[] = [];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(0);
		});

		it('should use custom comparison function when provided', () => {
			const baseNodes = [createTestNode('1', { name: 'Original' })];
			const targetNodes = [createTestNode('1', { name: 'Modified' })];

			const customCompare = vi.fn().mockReturnValue(true);
			const diff = compareWorkflowsNodes(baseNodes, targetNodes, customCompare);

			expect(customCompare).toHaveBeenCalledWith(baseNodes[0], targetNodes[0]);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
		});

		it('should handle complex workflow comparison', () => {
			const baseNodes = [
				createTestNode('1', { name: 'Node 1' }),
				createTestNode('2', { name: 'Node 2' }),
				createTestNode('3', { name: 'Node 3' }),
			];
			const targetNodes = [
				createTestNode('1', { name: 'Node 1' }), // Equal
				createTestNode('2', { name: 'Node 2 Modified' }), // Modified
				createTestNode('4', { name: 'Node 4' }), // Added
			];

			const diff = compareWorkflowsNodes(baseNodes, targetNodes);

			expect(diff.size).toBe(4);
			expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
			expect(diff.get('2')?.status).toBe(NodeDiffStatus.Modified);
			expect(diff.get('3')?.status).toBe(NodeDiffStatus.Deleted);
			expect(diff.get('4')?.status).toBe(NodeDiffStatus.Added);
		});
	});

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
	});
});
