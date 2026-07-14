import type {
	IConnections,
	IWorkflowGroup,
	INodeTypeDescription,
	NodeGroupValidationResult,
	NodeSelectionValidationResult,
} from 'n8n-workflow';
import {
	NodeHelpers,
	validateNodeSelectionForExtraction,
	validateNodeSelectionForGrouping,
} from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

export type SelectionValidationResult = NodeSelectionValidationResult<INodeUi>;
export type GroupValidationResult = NodeGroupValidationResult<INodeUi>;

type GroupValidationOptions = {
	ignoredNodeGroupIds?: string[];
};

export function useSelectionValidation() {
	const nodeTypesStore = useNodeTypesStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

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

	function isSelectionExtractable(
		nodeIds: string[],
		connectionsBySourceNode?: IConnections,
	): SelectionValidationResult {
		return validateNodeSelectionForExtraction(getValidationInput(nodeIds, connectionsBySourceNode));
	}

	function isSelectionGroupable(
		nodeIds: string[],
		connectionsBySourceNode?: IConnections,
		options: GroupValidationOptions = {},
	): GroupValidationResult {
		const store = workflowDocumentStore.value;
		const ignoredNodeGroupIds = new Set(options.ignoredNodeGroupIds ?? []);
		const existingNodeGroups: IWorkflowGroup[] = (store?.allGroups ?? []).filter(
			(group) => !ignoredNodeGroupIds.has(group.id),
		);

		return validateNodeSelectionForGrouping({
			...getValidationInput(nodeIds, connectionsBySourceNode),
			existingNodeGroups,
		});
	}

	/**
	 * Resolves a prospective group selection: drops ids that don't resolve to a
	 * node, expands the rest with their attached sub-nodes, and validates the
	 * result. Returns the expanded member ids when groupable, null otherwise.
	 *
	 * Group creation eligibility and execution must both go through this so the
	 * checked selection and the created group can't diverge (e.g. stale ids
	 * being validated away but still persisted as group members).
	 */
	function resolveGroupableNodeIds(nodeIds: string[]): string[] | null {
		const store = workflowDocumentStore.value;
		const resolvedIds = nodeIds.filter((id) => store?.getNodeById(id));
		if (resolvedIds.length === 0) return null;

		const expandedIds = expandSelectionWithSubNodes(resolvedIds);
		return isSelectionGroupable(expandedIds).valid ? expandedIds : null;
	}

	function getValidationInput(nodeIds: string[], connectionsBySourceNode?: IConnections) {
		const store = workflowDocumentStore.value;
		const expression = store?.getExpressionHandler();
		const workflow = expression ? { expression } : null;

		const input = {
			nodes: nodeIds.flatMap((id) => store?.getNodeById(id) ?? []),
			connectionsBySourceNode: connectionsBySourceNode ?? store?.connectionsBySourceNode ?? {},
			getNodeType: (node: INodeUi) => nodeTypesStore.getNodeType(node.type, node.typeVersion),
		};

		if (!workflow) return input;

		return {
			...input,
			getNodeInputs: (node: INodeUi, nodeType: INodeTypeDescription) =>
				NodeHelpers.getNodeInputs(workflow, node, nodeType),
			getNodeOutputs: (node: INodeUi, nodeType: INodeTypeDescription) =>
				NodeHelpers.getNodeOutputs(workflow, node, nodeType),
		};
	}

	return {
		isSelectionExtractable,
		isSelectionGroupable,
		expandSelectionWithSubNodes,
		resolveGroupableNodeIds,
	};
}
