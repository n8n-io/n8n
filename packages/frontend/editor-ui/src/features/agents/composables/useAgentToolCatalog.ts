import { computed, ref } from 'vue';
import { AI_VENDOR_NODE_TYPES, NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import {
	AGENT_BUILDER_AVAILABLE_AI_UTILITY_TOOL_NODE_TYPES,
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
	SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
} from '@n8n/api-types';
import nodePopularity from 'virtual:node-popularity-data';

import { AI_SECTION_RECOMMENDED_TOOLS } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IWorkflowDb } from '@/Interface';
import { isMcpRelatedNodeType } from './useMcpServerAdapter';

const nodePopularityMap = new Map(nodePopularity.map((node) => [node.id, node.popularity]));
const supportedWorkflowToolTriggerTypes = new Set<string>(SUPPORTED_WORKFLOW_TOOL_TRIGGERS);
const incompatibleWorkflowToolBodyNodeTypes = new Set<string>(
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
);
const agentProviderNodeTypes = new Set<string>(AI_VENDOR_NODE_TYPES);
const hiddenAvailableToolNodeTypes = new Set<string>(
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
);
const availableAiUtilityToolNodeTypes = new Set<string>(
	AGENT_BUILDER_AVAILABLE_AI_UTILITY_TOOL_NODE_TYPES,
);

function hasInputs(nodeType: INodeTypeDescription): boolean {
	const { inputs } = nodeType;
	if (Array.isArray(inputs)) return inputs.length > 0;
	return true;
}

function isAgentProviderNodeType(nodeType: INodeTypeDescription): boolean {
	return agentProviderNodeTypes.has(nodeType.name);
}

function isHiddenAvailableToolType(nodeType: INodeTypeDescription): boolean {
	return hiddenAvailableToolNodeTypes.has(nodeType.name);
}

function hasToolsSubcategory(nodeType: INodeTypeDescription, subcategory: string): boolean {
	return nodeType.codex?.subcategories?.Tools?.includes(subcategory) ?? false;
}

export function isAvailableAiToolType(nodeType: INodeTypeDescription): boolean {
	return isAgentProviderNodeType(nodeType) || availableAiUtilityToolNodeTypes.has(nodeType.name);
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
 * Category rank used to order the single "nodes" section: MCP → AI → n8n → rest.
 * Lower comes first.
 */
function nodeTypeOrderRank(nodeType: INodeTypeDescription): number {
	if (isMcpRelatedNodeType(nodeType.name)) return 0;
	if (isAvailableAiToolType(nodeType)) return 1;
	if (isAvailableN8nToolType(nodeType)) return 2;
	return 3;
}

/**
 * Catalog of node types and project workflows eligible as agent tools.
 * Ordering within the nodes section preserves the old category priority now
 * that those categories are collapsed into one shared "Connect to a service" list.
 */
export function useAgentToolCatalog() {
	const nodeTypesStore = useNodeTypesStore();
	const workflowsListStore = useWorkflowsListStore();

	/**
	 * Fetched workflows kept local — do NOT write into workflowsListStore's
	 * shared cache (would clobber the Workflows list page).
	 */
	const projectWorkflows = ref<IWorkflowDb[]>([]);

	const availableToolTypes = computed<INodeTypeDescription[]>(() => {
		const names = new Set([
			...(nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames[NodeConnectionTypes.AiTool] ??
				[]),
			...AI_VENDOR_NODE_TYPES,
		]);

		return [...names]
			.map((name) => nodeTypesStore.getNodeType(name))
			.filter(
				(nt): nt is INodeTypeDescription =>
					nt !== null &&
					!nt.hidden &&
					!isHiddenAvailableToolType(nt) &&
					(isAgentProviderNodeType(nt) || !hasInputs(nt)),
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
				select: ['id', 'name', 'description', 'isArchived', 'nodes'],
			});
		} catch (error) {
			console.warn('[useAgentToolCatalog] failed to load workflows for project', error);
		}
	}

	return {
		availableToolTypes,
		availableWorkflows,
		loadWorkflows,
	};
}
