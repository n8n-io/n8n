import type { WorkflowJSON } from '@n8n/workflow-sdk';

const LANGCHAIN_TYPE_PREFIX = '@n8n/n8n-nodes-langchain.';

export interface DetectAiNodesResult {
	aiNodeNames: string[];
}

export function detectAiNodes(workflow: WorkflowJSON): DetectAiNodesResult {
	const aiNodeNames: string[] = [];

	for (const node of workflow.nodes ?? []) {
		if (!node.name) continue;
		if (node.type.startsWith(LANGCHAIN_TYPE_PREFIX)) {
			aiNodeNames.push(node.name);
		}
	}

	return {
		aiNodeNames,
	};
}
