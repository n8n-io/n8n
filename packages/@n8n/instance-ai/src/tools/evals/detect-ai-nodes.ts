import type { WorkflowJSON } from '@n8n/workflow-sdk';

const LANGCHAIN_TYPE_PREFIX = '@n8n/n8n-nodes-langchain.';
const EVALUATION_TYPES = new Set<string>([
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.evaluationTrigger',
]);

const NON_ROOT_TYPE_PARTS = ['trigger', 'lm', 'model', 'embedding', 'memory', 'tool'];

const NODE_JSON_REFERENCE_REGEX =
	/\$\((?:"([^"]+)"|'([^']+)')\)\.(?:item|first\(\)|last\(\))\.json\b|\$node\[(?:"([^"]+)"|'([^']+)')\]\.json\b/;

export interface DetectAiNodesResult {
	isAiWorkflow: boolean;
	aiNodeNames: string[];
	alreadyConfigured: boolean;
	rootAgentReadsOtherNode: boolean;
}

function isRootAgentType(type: string): boolean {
	if (!type.startsWith(LANGCHAIN_TYPE_PREFIX)) return false;
	const lower = type.toLowerCase();
	return !NON_ROOT_TYPE_PARTS.some((part) => lower.includes(part));
}

function collectStrings(value: unknown, sink: string[]): void {
	if (typeof value === 'string') {
		sink.push(value);
		return;
	}
	if (Array.isArray(value)) {
		for (const v of value) collectStrings(v, sink);
		return;
	}
	if (value && typeof value === 'object') {
		for (const v of Object.values(value)) collectStrings(v, sink);
	}
}

function paramsReferenceOtherNode(parameters: unknown): boolean {
	const strings: string[] = [];
	collectStrings(parameters, strings);
	return strings.some((s) => NODE_JSON_REFERENCE_REGEX.test(s));
}

export function detectAiNodes(workflow: WorkflowJSON): DetectAiNodesResult {
	const aiNodeNames: string[] = [];
	let alreadyConfigured = false;
	let rootAgentReadsOtherNode = false;

	for (const node of workflow.nodes ?? []) {
		if (!node.name) continue;
		if (node.type.startsWith(LANGCHAIN_TYPE_PREFIX)) {
			aiNodeNames.push(node.name);
		}
		if (EVALUATION_TYPES.has(node.type)) {
			alreadyConfigured = true;
		}
		if (isRootAgentType(node.type) && paramsReferenceOtherNode(node.parameters)) {
			rootAgentReadsOtherNode = true;
		}
	}

	return {
		isAiWorkflow: aiNodeNames.length > 0,
		aiNodeNames,
		alreadyConfigured,
		rootAgentReadsOtherNode,
	};
}
