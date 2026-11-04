const EXECUTE_WORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';

interface TriggerLike {
	type?: string;
	parameters?: object;
}

// empty trigger params fail validation, default to passthrough
export function normalizeExecuteWorkflowTriggers<T extends TriggerLike>(nodes: T[]): T[] {
	return nodes.map((node) => {
		if (node.type !== EXECUTE_WORKFLOW_TRIGGER) return node;
		const params: Record<string, unknown> = { ...node.parameters };
		if (params.inputSource !== undefined || params.workflowInputs !== undefined) return node;
		return { ...node, parameters: { ...params, inputSource: 'passthrough' } };
	});
}
