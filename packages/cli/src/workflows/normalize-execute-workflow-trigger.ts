import type { INode } from 'n8n-workflow';

const EXECUTE_WORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';

// empty trigger params fail validation, default to passthrough
export function normalizeExecuteWorkflowTriggers<T extends Pick<INode, 'type' | 'parameters'>>(
	nodes: T[],
): T[] {
	return nodes.map((node) => {
		if (node.type !== EXECUTE_WORKFLOW_TRIGGER) return node;
		const params = node.parameters ?? {};
		if (params.inputSource !== undefined || params.workflowInputs !== undefined) return node;
		return { ...node, parameters: { ...params, inputSource: 'passthrough' } };
	});
}
