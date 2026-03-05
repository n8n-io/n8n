import { AGENT_NODE_TYPE, AGENT_TOOL_NODE_TYPE } from '@/app/constants';
import type { INodeUi } from '@/Interface';
import type { NodeConnectionType, INodeInputConfiguration, Workflow } from 'n8n-workflow';
import { NodeHelpers, NodeConnectionTypes, isHitlToolType } from 'n8n-workflow';
import type { NodeCreatorFilter } from './useViewStacks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed } from 'vue';

export function useGetNodeCreatorFilter() {
	const workflowStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	const workflowObject = computed(() => workflowStore.workflowObject as Workflow);

	function getNodeCreatorFilter(
		nodeName: string,
		outputType: NodeConnectionType,
		sourceNode: INodeUi,
	) {
		let filter: NodeCreatorFilter | undefined;
		const workflowNode = workflowObject.value.getNode(nodeName);
		if (!workflowNode) return { nodes: [] };

		const nodeType =
			nodeTypesStore.getNodeType(workflowNode?.type, workflowNode.typeVersion) ??
			nodeTypesStore.communityNodeType(workflowNode?.type)?.nodeDescription;
		if (nodeType) {
			const inputs = NodeHelpers.getNodeInputs(workflowObject.value, workflowNode, nodeType);

			const filterFound = inputs.filter((input) => {
				if (typeof input === 'string' || input.type !== outputType || !input.filter) {
					// No filters defined or wrong connection type
					return false;
				}

				return true;
			}) as INodeInputConfiguration[];

			if (filterFound.length) {
				filter = filterFound[0].filter;
			}
		}

		if (outputType === NodeConnectionTypes.AiTool) {
			const isConnectionToAgent =
				sourceNode.type === AGENT_NODE_TYPE || sourceNode.type === AGENT_TOOL_NODE_TYPE;
			// show HITL tools only for agent node
			// HITL tools are not compatible with other nodes
			const conditions: NodeCreatorFilter['conditions'] = [
				(node) => (isConnectionToAgent ? true : !isHitlToolType(node.key)),
			];
			filter = { ...filter, conditions };
		}

		return filter;
	}

	return { getNodeCreatorFilter };
}
