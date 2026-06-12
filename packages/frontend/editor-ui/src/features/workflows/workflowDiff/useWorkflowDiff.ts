import type { CanvasConnection, CanvasNode } from '@/features/workflows/canvas/canvas.types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import {
	toValue,
	computed,
	ref,
	watchEffect,
	shallowRef,
	onScopeDispose,
	effectScope,
	type MaybeRefOrGetter,
	type Ref,
	type ComputedRef,
	type EffectScope,
} from 'vue';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';
import type { IConnections, INodeTypeDescription, NodeDiff } from 'n8n-workflow';
import { compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	useWorkflowExecutionStateStore,
	disposeWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { useWorkflowDocumentRenderData } from '@/app/stores/workflowDocument/useWorkflowDocumentRenderData';
import {
	createEmptyCanvasRenderData,
	type CanvasRenderData,
} from '@/features/workflows/canvas/canvas.utils';

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

function createWorkflowRefs(workflow: MaybeRefOrGetter<IWorkflowDb | undefined>) {
	const workflowRef = computed(() => toValue(workflow));
	const workflowNodes = ref<INodeUi[]>([]);
	const workflowConnections = ref<IConnections>({});

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

			workflowNodes.value = nodesWithIds;
			workflowConnections.value = workflowValue.connections;
		}
	});

	return {
		workflowRef,
		workflowNodes,
		workflowConnections,
	};
}

function createWorkflowDiff(
	workflowRef: ComputedRef<IWorkflowDb | undefined>,
	workflowNodes: Ref<INodeUi[]>,
	workflowConnections: Ref<IConnections>,
	renderData: Ref<CanvasRenderData>,
) {
	const { nodes, connections } = useCanvasMapping({
		nodes: workflowNodes,
		connections: workflowConnections,
		renderData,
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

function createDiffRenderData(
	workflowRef: ComputedRef<IWorkflowDb | undefined>,
	workflowNodes: Ref<INodeUi[]>,
	side: string,
) {
	const renderData = shallowRef<CanvasRenderData>(createEmptyCanvasRenderData());
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore> | null = null;
	// Document id of the stores this side currently owns.
	let currentDocumentId: WorkflowDocumentId | null = null;
	// `useWorkflowDocumentRenderData` is side-effectful; own its scope so it can
	// be torn down when the diffed workflow changes or this side disposes.
	let renderDataScope: EffectScope | undefined;

	function disposeStores() {
		renderDataScope?.stop();
		renderDataScope = undefined;
		if (currentDocumentId) {
			// Render data created an execution-state store keyed by this document id;
			// dispose it with the document store so neither outlives the diff side.
			disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(currentDocumentId));
			currentDocumentId = null;
		}
		if (workflowDocumentStore) {
			disposeWorkflowDocumentStore(workflowDocumentStore);
			workflowDocumentStore = null;
		}
	}

	watchEffect(() => {
		const wf = workflowRef.value;
		if (!wf?.id) return;

		disposeStores();

		const versionId = wf.versionId ?? `diff-${side}`;
		const docId = createWorkflowDocumentId(wf.id, versionId);

		workflowDocumentStore = useWorkflowDocumentStore(docId);
		// Hydrate from the same normalized nodes that feed the canvas so the
		// render-data maps are keyed by the same node IDs the canvas looks up.
		// Shallow-copy the nodes so the document store owns/mutates its own node
		// objects (e.g. position snapping) without leaking into `workflowNodes`.
		workflowDocumentStore.hydrate({
			...wf,
			nodes: workflowNodes.value.map((node) => ({ ...node })),
			versionId,
		} as IWorkflowDb);
		currentDocumentId = docId;
		renderDataScope = effectScope(true);
		renderDataScope.run(() => {
			renderData.value = useWorkflowDocumentRenderData(docId);
		});
	});

	return { renderData, dispose: disposeStores };
}

export const useWorkflowDiff = (
	sourceWorkflow: MaybeRefOrGetter<IWorkflowDb | undefined>,
	targetWorkflow: MaybeRefOrGetter<IWorkflowDb | undefined>,
) => {
	const nodeTypesStore = useNodeTypesStore();

	const sourceRefs = createWorkflowRefs(sourceWorkflow);
	const targetRefs = createWorkflowRefs(targetWorkflow);

	const { renderData: sourceRenderData, dispose: disposeSource } = createDiffRenderData(
		sourceRefs.workflowRef,
		sourceRefs.workflowNodes,
		'source',
	);
	const { renderData: targetRenderData, dispose: disposeTarget } = createDiffRenderData(
		targetRefs.workflowRef,
		targetRefs.workflowNodes,
		'target',
	);

	const sourceDiff = createWorkflowDiff(
		sourceRefs.workflowRef,
		sourceRefs.workflowNodes,
		sourceRefs.workflowConnections,
		sourceRenderData,
	);

	const targetDiff = createWorkflowDiff(
		targetRefs.workflowRef,
		targetRefs.workflowNodes,
		targetRefs.workflowConnections,
		targetRenderData,
	);

	onScopeDispose(() => {
		disposeSource();
		disposeTarget();
	});

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
		sourceRenderData,
		targetRenderData,
		nodesDiff,
		connectionsDiff,
	};
};
