import type { WorkflowJSON } from '@n8n/workflow-sdk';

const LANGCHAIN_TYPE_PREFIX = '@n8n/n8n-nodes-langchain.';
const EVALUATION_TYPES = new Set<string>([
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.evaluationTrigger',
]);

export interface DetectAiNodesResult {
	isAiWorkflow: boolean;
	aiNodeNames: string[];
	alreadyConfigured: boolean;
}

export function detectAiNodes(workflow: WorkflowJSON): DetectAiNodesResult {
	const aiNodeNames: string[] = [];
	let alreadyConfigured = false;

	for (const node of workflow.nodes ?? []) {
		if (!node.name) continue;
		if (node.type.startsWith(LANGCHAIN_TYPE_PREFIX)) {
			aiNodeNames.push(node.name);
		}
		if (EVALUATION_TYPES.has(node.type)) {
			alreadyConfigured = true;
		}
	}

	return {
		isAiWorkflow: aiNodeNames.length > 0,
		aiNodeNames,
		alreadyConfigured,
	};
}
