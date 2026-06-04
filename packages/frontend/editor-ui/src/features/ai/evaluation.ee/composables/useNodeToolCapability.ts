import { NodeHelpers, NodeConnectionTypes } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function useNodeToolCapability() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();

	function nodeCanHaveTools(nodeName: string): boolean {
		if (!nodeName) return false;
		try {
			const wfNode = workflowDocumentStore.value?.getNodeByName(nodeName);
			if (!wfNode) return false;
			const nodeType = nodeTypesStore.getNodeType(wfNode.type, wfNode.typeVersion);
			if (!nodeType) return false;
			const expression = workflowDocumentStore.value.getExpressionHandler();
			const inputs = NodeHelpers.getNodeInputs({ expression }, wfNode, nodeType);
			const types = NodeHelpers.getConnectionTypes(inputs);
			return types.includes(NodeConnectionTypes.AiTool);
		} catch {
			return false;
		}
	}

	return { nodeCanHaveTools };
}
