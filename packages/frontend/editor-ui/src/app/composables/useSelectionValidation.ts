import {
	buildAdjacencyList,
	NodeConnectionTypes,
	NodeHelpers,
	parseExtractableSubgraphSelection,
} from 'n8n-workflow';
import type {
	AdjacencyList,
	ExtractableErrorResult,
	ExtractableSubgraphData,
	IConnections,
} from 'n8n-workflow';
import { computed } from 'vue';

import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';

export type SelectionValidationResult =
	| { valid: true; subGraph: INodeUi[]; subGraphData: ExtractableSubgraphData }
	| { valid: false; reason: 'too-few-nodes' }
	| { valid: false; reason: 'trigger-selected'; triggers: string[] }
	| { valid: false; reason: 'invalid-subgraph'; errors: ExtractableErrorResult[] }
	| { valid: false; reason: 'multiple-input-branches'; node: string }
	| { valid: false; reason: 'multiple-output-branches'; node: string };

export type GroupValidationResult =
	| SelectionValidationResult
	| {
			valid: false;
			reason: 'non-main-boundary';
			connection: { source: string; target: string; type: string };
	  };

export function useSelectionValidation() {
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	const workflowDocumentStore = computed(() => {
		if (workflowsStore.workflowId) {
			return useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId));
		}
		return null;
	});

	const adjacencyList = computed(() =>
		buildAdjacencyList(workflowDocumentStore.value?.connectionsBySourceNode ?? {}),
	);

	function isSingleMainIO(
		nodeName: string,
		getIOs: (
			...x: Parameters<typeof NodeHelpers.getNodeInputs>
		) => ReturnType<typeof NodeHelpers.getNodeInputs>,
	): boolean {
		const node = workflowDocumentStore.value?.getNodeByName(nodeName);
		if (!node) return true;
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) return true;
		const expression = workflowDocumentStore.value?.getExpressionHandler();
		if (!expression) return true;

		const ios = getIOs({ expression }, node, nodeType);
		return (
			ios.filter((io: string | { type: string }) =>
				typeof io === 'string'
					? io === NodeConnectionTypes.Main
					: io.type === NodeConnectionTypes.Main,
			).length <= 1
		);
	}

	/**
	 * Expands a selection of node ids to include all sub-nodes (memory, tools,
	 * models, etc.) attached to any selected node via non-main connections.
	 *
	 * Sub-nodes connect to their parent as graph parents via `ai_*` edges, so we
	 * walk `getParentNodes(name, 'ALL_NON_MAIN', -1)` for each selection member
	 * and unify the results. Sub-sub-nodes are captured by the recursive walk.
	 */
	function expandSelectionWithSubNodes(nodeIds: string[]): string[] {
		const store = workflowDocumentStore.value;
		if (!store) return [...nodeIds];

		const expanded = new Set<string>(nodeIds);
		for (const id of nodeIds) {
			const node = store.getNodeById(id);
			if (!node) continue;

			for (const subNodeName of store.getParentNodes(node.name, 'ALL_NON_MAIN', -1)) {
				const subNode = store.getNodeByName(subNodeName);
				if (subNode) expanded.add(subNode.id);
			}
		}
		return Array.from(expanded);
	}

	function findDisconnectedSelectionError(
		nodeNames: Set<string>,
		currentAdjacencyList: AdjacencyList,
	): ExtractableErrorResult | null {
		if (nodeNames.size <= 1) return null;

		const neighborsByNodeName = new Map<string, Set<string>>();
		for (const nodeName of nodeNames) {
			neighborsByNodeName.set(nodeName, new Set());
		}

		for (const [sourceNodeName, connections] of currentAdjacencyList.entries()) {
			if (!nodeNames.has(sourceNodeName)) continue;

			const sourceNeighbors = neighborsByNodeName.get(sourceNodeName);
			if (!sourceNeighbors) continue;

			for (const connection of connections) {
				const targetNodeName = connection.node;
				if (!nodeNames.has(targetNodeName) || targetNodeName === sourceNodeName) continue;

				sourceNeighbors.add(targetNodeName);
				neighborsByNodeName.get(targetNodeName)?.add(sourceNodeName);
			}
		}

		const firstNodeName = nodeNames.values().next().value;
		if (!firstNodeName) return null;

		const visited = new Set<string>([firstNodeName]);
		const queue = [firstNodeName];
		while (queue.length > 0) {
			const currentNodeName = queue.shift();
			if (!currentNodeName) continue;

			for (const neighborNodeName of neighborsByNodeName.get(currentNodeName) ?? []) {
				if (visited.has(neighborNodeName)) continue;

				visited.add(neighborNodeName);
				queue.push(neighborNodeName);
			}
		}

		if (visited.size === nodeNames.size) return null;

		const disconnectedNodeName = Array.from(nodeNames).find((nodeName) => !visited.has(nodeName));
		if (!disconnectedNodeName) return null;

		return {
			errorCode: 'No Continuous Path From Root To Leaf In Selection',
			start: firstNodeName,
			end: disconnectedNodeName,
		};
	}

	function findNonMainBoundaryConnection(
		nodeNames: Set<string>,
		connectionsBySourceNode: IConnections,
	): { source: string; target: string; type: string } | null {
		for (const [sourceNodeName, sourceConnections] of Object.entries(connectionsBySourceNode)) {
			const sourceInside = nodeNames.has(sourceNodeName);

			for (const [type, connectionsByOutputIndex] of Object.entries(sourceConnections)) {
				if (type === NodeConnectionTypes.Main) continue;

				for (const connections of connectionsByOutputIndex) {
					for (const connection of connections ?? []) {
						if (sourceInside === nodeNames.has(connection.node)) continue;

						return { source: sourceNodeName, target: connection.node, type };
					}
				}
			}
		}

		return null;
	}

	function isSelectionExtractable(
		nodeIds: string[],
		connectionsBySourceNode?: IConnections,
	): SelectionValidationResult {
		if (nodeIds.length < 2) {
			return { valid: false, reason: 'too-few-nodes' };
		}

		const subGraph: INodeUi[] = [];
		for (const id of nodeIds) {
			const node = workflowDocumentStore.value?.getNodeById(id);
			if (!node) return { valid: false, reason: 'too-few-nodes' };
			subGraph.push(node);
		}

		const triggers = subGraph.filter((node) => nodeTypesStore.isTriggerNode(node.type));
		if (triggers.length > 0) {
			return {
				valid: false,
				reason: 'trigger-selected',
				triggers: triggers.map((node) => node.name),
			};
		}

		const currentConnectionsBySourceNode =
			connectionsBySourceNode ?? workflowDocumentStore.value?.connectionsBySourceNode ?? {};
		const currentAdjacencyList = connectionsBySourceNode
			? buildAdjacencyList(currentConnectionsBySourceNode)
			: adjacencyList.value;
		const selectedNodeNames = new Set(subGraph.map((node) => node.name));
		const selection = parseExtractableSubgraphSelection(selectedNodeNames, currentAdjacencyList);

		if (Array.isArray(selection)) {
			return { valid: false, reason: 'invalid-subgraph', errors: selection };
		}

		const disconnectedSelectionError = findDisconnectedSelectionError(
			selectedNodeNames,
			currentAdjacencyList,
		);
		if (disconnectedSelectionError) {
			return { valid: false, reason: 'invalid-subgraph', errors: [disconnectedSelectionError] };
		}

		const { start, end } = selection;

		if (start && !isSingleMainIO(start, NodeHelpers.getNodeInputs)) {
			return { valid: false, reason: 'multiple-input-branches', node: start };
		}

		if (end && !isSingleMainIO(end, NodeHelpers.getNodeOutputs)) {
			return { valid: false, reason: 'multiple-output-branches', node: end };
		}

		return { valid: true, subGraph, subGraphData: selection };
	}

	function isSelectionGroupable(
		nodeIds: string[],
		connectionsBySourceNode?: IConnections,
	): GroupValidationResult {
		const extractableResult = isSelectionExtractable(nodeIds, connectionsBySourceNode);
		if (!extractableResult.valid) return extractableResult;

		const nodeNames = new Set(extractableResult.subGraph.map((node) => node.name));
		const currentConnectionsBySourceNode =
			connectionsBySourceNode ?? workflowDocumentStore.value?.connectionsBySourceNode ?? {};
		const boundaryConnection = findNonMainBoundaryConnection(
			nodeNames,
			currentConnectionsBySourceNode,
		);

		if (boundaryConnection) {
			return { valid: false, reason: 'non-main-boundary', connection: boundaryConnection };
		}

		return extractableResult;
	}

	return { isSelectionExtractable, isSelectionGroupable, expandSelectionWithSubNodes };
}
