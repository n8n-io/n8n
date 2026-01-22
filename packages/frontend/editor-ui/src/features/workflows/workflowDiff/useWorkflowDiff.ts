import type { CanvasConnection, CanvasNode } from '@/features/workflows/canvas/canvas.types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { MaybeRefOrGetter, Ref, ComputedRef } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { toValue, computed, ref, watchEffect, shallowRef } from 'vue';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';
import type { Workflow, IConnections, INodeTypeDescription, NodeDiff } from 'n8n-workflow';
import { compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function mapConnections(connections: CanvasConnection[]) {
	return connections.reduce(
		(acc, connection) => {
			acc.set.add(connection.id);
			acc.map.set(connection.id, connection);
			return acc;
		},
		{ set: new Set<string>(), map: new Map<string, CanvasConnection>() },
	);
}

function createWorkflowRefs(
	workflow: MaybeRefOrGetter<IWorkflowDb | undefined>,
	createWorkflowObject: (nodes: INodeUi[], connections: IConnections) => Workflow,
) {
	const workflowRef = computed(() => toValue(workflow));
	const workflowNodes = ref<INodeUi[]>([]);
	const workflowConnections = ref<IConnections>({});
	const workflowObjectRef = shallowRef<Workflow>(createWorkflowObject([], {}));

	watchEffect(() => {
		const workflowValue = workflowRef.value;
		if (workflowValue) {
			// Ensure all nodes have IDs before passing to canvas mapping
			// External sources (like postMessage) may provide nodes without IDs
			const nodesWithIds = workflowValue.nodes.map((node) => {
				if (!node.id) {
					return { ...node, id: window.crypto.randomUUID() };
				}
				return node;
			});

			workflowObjectRef.value = createWorkflowObject(nodesWithIds, workflowValue.connections);
			workflowNodes.value = nodesWithIds;
			workflowConnections.value = workflowValue.connections;
		}
	});

	return {
		workflowRef,
		workflowNodes,
		workflowConnections,
		workflowObjectRef,
	};
}

function createWorkflowDiff(
	workflowRef: ComputedRef<IWorkflowDb | undefined>,
	workflowNodes: Ref<INodeUi[]>,
	workflowConnections: Ref<IConnections>,
	workflowObjectRef: Ref<Workflow>,
) {
	// Call useCanvasMapping at setup time, not inside computed
	// This is required because useCanvasMapping uses inject() internally
	const { nodes, connections } = useCanvasMapping({
		nodes: workflowNodes,
		connections: workflowConnections,
		workflowObject: workflowObjectRef,
	});

	const canvasData = computed(() => {
		if (!workflowRef.value) {
			return {
				workflow: undefined,
				nodes: [],
				connections: [],
			};
		}

		return {
			workflow: workflowRef,
			nodes: nodes.value.map((node: CanvasNode) => {
				node.draggable = false;
				node.selectable = false;
				node.focusable = false;
				return node;
			}),
			connections: connections.value.map((connection: CanvasConnection) => {
				connection.selectable = false;
				connection.focusable = false;
				// Remove execution data from connection labels in diff context
				connection.label = '';
				return connection;
			}),
		};
	});

	return {
		canvasData,
		// Return workflowNodes ref so diff logic can use nodes with generated IDs
		workflowNodes,
	};
}

export const useWorkflowDiff = (
	sourceWorkflow: MaybeRefOrGetter<IWorkflowDb | undefined>,
	targetWorkflow: MaybeRefOrGetter<IWorkflowDb | undefined>,
) => {
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	const sourceRefs = createWorkflowRefs(sourceWorkflow, workflowsStore.createWorkflowObject);
	const targetRefs = createWorkflowRefs(targetWorkflow, workflowsStore.createWorkflowObject);

	const sourceDiff = createWorkflowDiff(
		sourceRefs.workflowRef,
		sourceRefs.workflowNodes,
		sourceRefs.workflowConnections,
		sourceRefs.workflowObjectRef,
	);

	const targetDiff = createWorkflowDiff(
		targetRefs.workflowRef,
		targetRefs.workflowNodes,
		targetRefs.workflowConnections,
		targetRefs.workflowObjectRef,
	);

	// Expose canvas data as source/target for backwards compatibility
	const source = sourceDiff.canvasData;
	const target = targetDiff.canvasData;

	const nodesDiff = computed(() => {
		// Use workflowNodes refs which have generated IDs for nodes without IDs
		// This ensures consistency between canvas mapping and diff logic
		const sourceNodes = sourceDiff.workflowNodes.value;
		const targetNodes = targetDiff.workflowNodes.value;

		// If neither workflow exists, return empty diff
		if (sourceNodes.length === 0 && targetNodes.length === 0) {
			return new Map<string, NodeDiff<INodeUi>>();
		}

		return compareWorkflowsNodes(sourceNodes, targetNodes);
	});

	type Connection = {
		id: string;
		source?: INodeUi;
		target?: INodeUi;
		sourceType: INodeTypeDescription | null;
		targetType: INodeTypeDescription | null;
	};

	function formatConnectionDiff(
		id: string,
		status: NodeDiffStatus,
		collection: Map<string, CanvasConnection>,
		accumulator: Map<string, { status: NodeDiffStatus; connection: Connection }>,
	) {
		const connection = collection.get(id);
		if (!connection) return;

		const sourceNode = nodesDiff.value.get(connection.source)?.node;
		const targetNode = nodesDiff.value.get(connection.target)?.node;

		accumulator.set(id, {
			status,
			connection: {
				id,
				source: sourceNode,
				target: targetNode,
				sourceType: sourceNode
					? nodeTypesStore.getNodeType(sourceNode.type, sourceNode.typeVersion)
					: null,
				targetType: targetNode
					? nodeTypesStore.getNodeType(targetNode.type, targetNode.typeVersion)
					: null,
			},
		});
	}

	const connectionsDiff = computed(() => {
		// Handle case where one or both workflows don't exist
		const sourceConnections = mapConnections(source.value?.connections ?? []);
		const targetConnections = mapConnections(target.value?.connections ?? []);

		// If neither workflow has connections, return empty diff
		if (sourceConnections.set.size === 0 && targetConnections.set.size === 0) {
			return new Map<string, { status: NodeDiffStatus; connection: Connection }>();
		}

		const added = targetConnections.set.difference(sourceConnections.set);
		const removed = sourceConnections.set.difference(targetConnections.set);

		const acc = new Map<string, { status: NodeDiffStatus; connection: Connection }>();

		for (const id of added.values()) {
			formatConnectionDiff(id, NodeDiffStatus.Added, targetConnections.map, acc);
		}

		for (const id of removed.values()) {
			formatConnectionDiff(id, NodeDiffStatus.Deleted, sourceConnections.map, acc);
		}

		return acc;
	});

	return {
		source,
		target,
		nodesDiff,
		connectionsDiff,
	};
};
