import { computed, ref } from 'vue';
import {
	NodeConnectionTypes,
	isCommunityPackageName,
	type INodeTypeDescription,
} from 'n8n-workflow';
import {
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
	getWorkflowToolIncompatibilityReason,
} from '@n8n/api-types';
import nodePopularity from 'virtual:node-popularity-data';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { ToolCategoryKey } from '@/features/shared/toolsConnection/types';
import type { IWorkflowDb } from '@/Interface';
import { getAgentRuntimeIdentity } from './useAgentApi';
import { isMcpRelatedNodeType } from './useMcpServerAdapter';

const nodePopularityMap = new Map(nodePopularity.map((node) => [node.id, node.popularity]));
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

export function isWorkflowCompatibleWithAgentTools(workflow: IWorkflowDb): boolean {
	return getWorkflowToolIncompatibilityReason(workflow) === null;
}

/**
 * Tab a node type belongs to in the tools connection modal.
 *
 * MCP tools keep their own tab. All other tools use the n8n nodes tab.
 * Community packages are still matched first by provenance so they cannot
 * claim another category through their metadata.
 */
export function toolCategoryForNodeType(nodeType: INodeTypeDescription): ToolCategoryKey {
	if (isCommunityPackageName(nodeType.name)) return 'app-action';
	if (isMcpRelatedNodeType(nodeType.name)) return 'mcp';
	return 'app-action';
}

/**
 * Ordering within a tab, derived from the category so there is one source of
 * truth. Every category `toolCategoryForNodeType` can return must appear here:
 * `indexOf` returns -1 for a missing one, which would sort it ahead of the rest.
 */
const NODE_CATEGORY_ORDER: ToolCategoryKey[] = ['mcp', 'app-action'];

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
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();

	/**
	 * Runtime identity: the name of the other project of each workflow that a
	 * project gave the agent access to. Workflows of the agent's own project
	 * have no entry.
	 */
	const workflowProjectNames = ref(new Map<string, string>());

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

	// `connections` is needed to scope the compatibility check to nodes
	// actually reachable from a supported trigger. A null `activeVersionId`
	// marks unpublished workflows (shown by the tool config panel).
	async function searchProjectWorkflows(projectId?: string) {
		return await workflowsListStore.searchWorkflows({
			projectId,
			select: [
				'id',
				'name',
				'description',
				'isArchived',
				'activeVersionId',
				'nodes',
				'connections',
				'updatedAt',
			],
		});
	}

	/** The other projects that gave the agent access. Their workflows can be tools too. */
	async function loadOtherProjects(projectId?: string, agentId?: string) {
		if (!projectId || !agentId || !settingsStore.isAgentsRuntimeIdentityEnabled) return [];
		try {
			const status = await getAgentRuntimeIdentity(rootStore.restApiContext, projectId, agentId);
			return status.otherProjects;
		} catch {
			// The agent's own workflows still load.
			return [];
		}
	}

	async function loadWorkflows(projectId?: string, agentId?: string): Promise<boolean> {
		try {
			const [own, otherProjects] = await Promise.all([
				searchProjectWorkflows(projectId),
				loadOtherProjects(projectId, agentId),
			]);
			const projectNames = new Map<string, string>();
			const others = await Promise.all(
				otherProjects.map(async (project) => {
					const workflows = await searchProjectWorkflows(project.id);
					for (const workflow of workflows) projectNames.set(workflow.id, project.name);
					return workflows;
				}),
			);
			workflowProjectNames.value = projectNames;
			projectWorkflows.value = [...own, ...others.flat()];
			return true;
		} catch (error) {
			console.warn('[useAgentToolCatalog] failed to load workflows for project', error);
			return false;
		}
	}

	return {
		availableToolTypes,
		availableWorkflows,
		projectWorkflows,
		workflowProjectNames,
		loadWorkflows,
		resolveToolNodeType,
	};
}
