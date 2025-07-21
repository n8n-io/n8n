import _pick from 'lodash-es/pick';
import _isEqual from 'lodash-es/isEqual';
import type { CanvasConnection } from '@/types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { toValue, computed, ref, watchEffect } from 'vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { Workflow, IConnections, INodeTypeDescription } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export const enum NodeDiffStatus {
	Eq = 'equal',
	Modified = 'modified',
	Added = 'added',
	Deleted = 'deleted',
}

export type NodeDiff<T> = {
	status: NodeDiffStatus;
	node: T;
};

export type WorkflowDiff<T> = Map<string, NodeDiff<T>>;

export function compareNodes<T extends { id: string }>(
	base: T | undefined,
	target: T | undefined,
): boolean {
	const propsToCompare = ['name', 'type', 'typeVersion', 'webhookId', 'credentials', 'parameters'];

	const baseNode = _pick(base, propsToCompare);
	const targetNode = _pick(target, propsToCompare);

	return _isEqual(baseNode, targetNode);
}

export function compareWorkflowsNodes<T extends { id: string }>(
	base: T[],
	target: T[],
	nodesEqual: (base: T | undefined, target: T | undefined) => boolean = compareNodes,
): WorkflowDiff<T> {
	const baseNodes = base.reduce<Map<string, T>>((acc, node) => {
		acc.set(node.id, node);
		return acc;
	}, new Map());

	const targetNodes = target.reduce<Map<string, T>>((acc, node) => {
		acc.set(node.id, node);
		return acc;
	}, new Map());

	const diff: WorkflowDiff<T> = new Map();

	baseNodes.entries().forEach(([id, node]) => {
		if (!targetNodes.has(id)) {
			diff.set(id, { status: NodeDiffStatus.Deleted, node });
		} else if (!nodesEqual(baseNodes.get(id), targetNodes.get(id))) {
			diff.set(id, { status: NodeDiffStatus.Modified, node });
		} else {
			diff.set(id, { status: NodeDiffStatus.Eq, node });
		}
	});

	targetNodes.entries().forEach(([id, node]) => {
		if (!baseNodes.has(id)) {
			diff.set(id, { status: NodeDiffStatus.Added, node });
		}
	});

	return diff;
}

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

export const useWorkflowDiff = (
	sourceWorkflow: MaybeRefOrGetter<IWorkflowDb | undefined>,
	targetWorkflow: MaybeRefOrGetter<IWorkflowDb | undefined>,
) => {
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	const sourceWorkflowRef = computed(() => toValue(sourceWorkflow));
	const sourceWorkflowNodes = ref<INodeUi[]>([]);
	const sourceWorkflowConnections = ref<IConnections>({});
	const sourceWorkflowObjectRef = ref<Workflow>();
	watchEffect(() => {
		const workflow = sourceWorkflowRef.value;
		if (workflow) {
			sourceWorkflowObjectRef.value = workflowsStore.getWorkflow(
				workflow.nodes,
				workflow.connections,
			);
			sourceWorkflowNodes.value = workflow.nodes;
			sourceWorkflowConnections.value = workflow.connections;
		}
	});

	const targetWorkflowRef = computed(() => toValue(targetWorkflow));
	const targetWorkflowNodes = ref<INodeUi[]>([]);
	const targetWorkflowConnections = ref<IConnections>({});
	const targetWorkflowObjectRef = ref<Workflow>();
	watchEffect(() => {
		const workflow = targetWorkflowRef.value;
		if (workflow) {
			targetWorkflowObjectRef.value = workflowsStore.getWorkflow(
				workflow.nodes,
				workflow.connections,
			);
			targetWorkflowNodes.value = workflow.nodes;
			targetWorkflowConnections.value = workflow.connections;
		}
	});

	const defaultWorkflowDiff = () => ({
		workflow: undefined,
		nodes: [],
		connections: [],
	});

	const source = computed(() => {
		if (!sourceWorkflowRef.value) return defaultWorkflowDiff();

		const { nodes, connections } = useCanvasMapping({
			nodes: sourceWorkflowNodes,
			connections: sourceWorkflowConnections,
			workflowObject: sourceWorkflowObjectRef as Ref<Workflow>,
		});

		return {
			workflow: sourceWorkflowRef,
			nodes: nodes.value.map((node) => {
				node.draggable = false;
				node.selectable = false;
				node.focusable = false;
				return node;
			}),
			connections: connections.value.map((connection) => {
				connection.selectable = false;
				connection.focusable = false;
				return connection;
			}),
		};
	});

	const target = computed(() => {
		if (!targetWorkflowRef.value) return defaultWorkflowDiff();

		const { nodes, connections } = useCanvasMapping({
			nodes: targetWorkflowNodes,
			connections: targetWorkflowConnections,
			workflowObject: targetWorkflowObjectRef as Ref<Workflow>,
		});

		return {
			workflow: targetWorkflowRef,
			nodes: nodes.value.map((node) => {
				node.draggable = false;
				node.selectable = false;
				node.focusable = false;
				return node;
			}),
			connections: connections.value.map((connection) => {
				connection.selectable = false;
				connection.focusable = false;
				return connection;
			}),
		};
	});

	const nodesDiff = computed(() =>
		compareWorkflowsNodes(
			source.value.workflow?.value?.nodes ?? [],
			target.value.workflow?.value?.nodes ?? [],
		),
	);

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
		const sourceConnections = mapConnections(source.value?.connections ?? []);
		const targetConnections = mapConnections(target.value?.connections ?? []);

		const added = targetConnections.set.difference(sourceConnections.set);
		const removed = sourceConnections.set.difference(targetConnections.set);

		const acc = new Map<string, { status: NodeDiffStatus; connection: Connection }>();

		added
			.values()
			.forEach((id) => formatConnectionDiff(id, NodeDiffStatus.Added, targetConnections.map, acc));
		removed
			.values()
			.forEach((id) =>
				formatConnectionDiff(id, NodeDiffStatus.Deleted, sourceConnections.map, acc),
			);
		return acc;
	});

	return {
		source,
		target,
		nodesDiff,
		connectionsDiff,
	};
};
