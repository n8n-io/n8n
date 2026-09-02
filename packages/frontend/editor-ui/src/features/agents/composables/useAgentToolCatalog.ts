import { computed, ref } from 'vue';
import {
	NodeConnectionTypes,
	isCommunityPackageName,
	type INodeTypeDescription,
} from 'n8n-workflow';
import {
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
	SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
} from '@n8n/api-types';
import nodePopularity from 'virtual:node-popularity-data';

import { AI_SECTION_RECOMMENDED_TOOLS } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { ToolCategoryKey } from '@/features/shared/toolsConnection/types';
import type { IWorkflowDb } from '@/Interface';
import { isMcpRelatedNodeType } from './useMcpServerAdapter';

const nodePopularityMap = new Map(nodePopularity.map((node) => [node.id, node.popularity]));
const supportedWorkflowToolTriggerTypes = new Set<string>(SUPPORTED_WORKFLOW_TOOL_TRIGGERS);
const incompatibleWorkflowToolBodyNodeTypes = new Set<string>(
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
);
const hiddenAvailableToolNodeTypes = new Set<string>(
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
);

export function hasInputs(nodeType: INodeTypeDescription): boolean {
	const { inputs } = nodeType;
	if (Array.isArray(inputs)) return inputs.length > 0;
	return true;
}

function isHiddenAvailableToolType(nodeType: INodeTypeDescription): boolean {
	return hiddenAvailableToolNodeTypes.has(nodeType.name);
}

function hasToolsSubcategory(nodeType: INodeTypeDescription, subcategory: string): boolean {
	return nodeType.codex?.subcategories?.Tools?.includes(subcategory) ?? false;
}

export function isAvailableN8nToolType(nodeType: INodeTypeDescription): boolean {
	return hasToolsSubcategory(nodeType, AI_SECTION_RECOMMENDED_TOOLS);
}

export function isWorkflowCompatibleWithAgentTools(workflow: IWorkflowDb): boolean {
	const nodes = workflow.nodes ?? [];
	const hasSupportedTrigger = nodes.some((node) =>
		supportedWorkflowToolTriggerTypes.has(node.type),
	);
	const hasIncompatibleBodyNode = nodes.some((node) =>
		incompatibleWorkflowToolBodyNodeTypes.has(node.type),
	);
	return hasSupportedTrigger && !hasIncompatibleBodyNode;
}

/**
 * Tab a node type belongs to in the tools connection modal.
 *
 * Community packages list alongside first-party ones in the app-action tab, but
 * are still matched first, by provenance rather than install state: that stops a
 * third-party package claiming the n8n tab through a self-declared "Recommended
 * Tools" codex subcategory. Nothing is taken from the MCP tab, which only
 * matches first-party names.
 */
export function toolCategoryForNodeType(nodeType: INodeTypeDescription): ToolCategoryKey {
	if (isCommunityPackageName(nodeType.name)) return 'app-action';
	if (isMcpRelatedNodeType(nodeType.name)) return 'mcp';
	if (isAvailableN8nToolType(nodeType)) return 'n8n';
	return 'app-action';
}

/**
 * Ordering within a tab, derived from the category so there is one source of
 * truth. Every category `toolCategoryForNodeType` can return must appear here:
 * `indexOf` returns -1 for a missing one, which would sort it ahead of the rest.
 */
const NODE_CATEGORY_ORDER: ToolCategoryKey[] = ['mcp', 'n8n', 'app-action'];

function nodeTypeOrderRank(nodeType: INodeTypeDescription): number {
	return NODE_CATEGORY_ORDER.indexOf(toolCategoryForNodeType(nodeType));
}

/**
 * Catalog of node types and project workflows eligible as agent tools.
 * Node types are sorted by category first, then popularity, so each category
 * tab lists its most-used tools first.
 */
export function useAgentToolCatalog() {
	const nodeTypesStore = useNodeTypesStore();
	const workflowsListStore = useWorkflowsListStore();

	/**
	 * Fetched workflows kept local — do NOT write into workflowsListStore's
	 * shared cache (would clobber the Workflows list page).
	 */
	const projectWorkflows = ref<IWorkflowDb[]>([]);

	/**
	 * Falls back to the community preview description so uninstalled verified
	 * community tools (already in the AiTool name index via visibleNodeTypes)
	 * are not dropped — same catalog the canvas Tools picker uses.
	 */
	function resolveToolNodeType(name: string): INodeTypeDescription | null {
		return (
			nodeTypesStore.getNodeType(name) ??
			nodeTypesStore.communityNodeType(name)?.nodeDescription ??
			null
		);
	}

	const availableToolTypes = computed<INodeTypeDescription[]>(() => {
		const names =
			nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames[NodeConnectionTypes.AiTool] ?? [];

		return [...new Set(names)]
			.map((name) => resolveToolNodeType(name))
			.filter(
				(nt): nt is INodeTypeDescription =>
					nt !== null && !nt.hidden && !isHiddenAvailableToolType(nt) && !hasInputs(nt),
			)
			.sort((a, b) => {
				const rankDiff = nodeTypeOrderRank(a) - nodeTypeOrderRank(b);
				if (rankDiff !== 0) return rankDiff;
				const popA = nodePopularityMap.get(a.name) ?? 0;
				const popB = nodePopularityMap.get(b.name) ?? 0;
				return popB - popA;
			});
	});

	const availableWorkflows = computed<IWorkflowDb[]>(() =>
		projectWorkflows.value.filter(
			(workflow) => !workflow.isArchived && isWorkflowCompatibleWithAgentTools(workflow),
		),
	);

	async function loadWorkflows(projectId?: string): Promise<void> {
		try {
			projectWorkflows.value = await workflowsListStore.searchWorkflows({
				projectId,
				triggerNodeTypes: [...SUPPORTED_WORKFLOW_TOOL_TRIGGERS],
				select: ['id', 'name', 'description', 'isArchived', 'nodes', 'updatedAt'],
			});
		} catch (error) {
			console.warn('[useAgentToolCatalog] failed to load workflows for project', error);
		}
	}

	return {
		availableToolTypes,
		availableWorkflows,
		projectWorkflows,
		loadWorkflows,
		resolveToolNodeType,
	};
}
