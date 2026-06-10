import type { WorkflowJSON } from '@n8n/workflow-sdk';

const LANGCHAIN_TYPE_PREFIX = '@n8n/n8n-nodes-langchain.';
const EVALUATION_TYPES = new Set<string>([
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.evaluationTrigger',
]);

// Explicit allow-list of root AI nodes — agents and chains that consume an LLM
// and produce the output we want to evaluate. Sub-components (chat models,
// memory, embeddings, tools, parsers, vector stores, retrievers, document
// loaders, text splitters, triggers) hang off a root and are NOT themselves
// evaluation targets. An allow-list avoids the substring traps that bite
// heuristics — e.g. `chainLlm` contains `lm`, which a substring deny-list
// would mistake for a chat-model sub-component.
const ROOT_AI_TYPES = new Set<string>([
	// Agents and chains.
	`${LANGCHAIN_TYPE_PREFIX}agent`,
	`${LANGCHAIN_TYPE_PREFIX}openAiAssistant`,
	`${LANGCHAIN_TYPE_PREFIX}chainLlm`,
	`${LANGCHAIN_TYPE_PREFIX}chainRetrievalQa`,
	`${LANGCHAIN_TYPE_PREFIX}chainSummarization`,
	`${LANGCHAIN_TYPE_PREFIX}informationExtractor`,
	`${LANGCHAIN_TYPE_PREFIX}sentimentAnalysis`,
	`${LANGCHAIN_TYPE_PREFIX}textClassifier`,
	// Vendor LLM nodes — workflows that wire directly to a model without a chain
	// wrapper are still AI workflows and should be offered eval suites.
	`${LANGCHAIN_TYPE_PREFIX}openAi`,
	`${LANGCHAIN_TYPE_PREFIX}anthropic`,
	`${LANGCHAIN_TYPE_PREFIX}googleGemini`,
	`${LANGCHAIN_TYPE_PREFIX}ollama`,
	`${LANGCHAIN_TYPE_PREFIX}alibabaCloud`,
	`${LANGCHAIN_TYPE_PREFIX}miniMax`,
	`${LANGCHAIN_TYPE_PREFIX}moonshot`,
]);

// Sub-component local-name prefixes (lowercased). Used only in the fallback
// path to filter out nodes that are clearly supporting components rather than
// workflow-level AI roots.
const SUB_COMPONENT_PREFIXES = [
	'lm',
	'embedding',
	'memory',
	'tool',
	'outputparser',
	'document',
	'textsplitter',
	'vectorstore',
	'retriever',
	'chattrigger',
	'manualchattrigger',
];

export interface DetectAiNodesResult {
	isAiWorkflow: boolean;
	aiNodeNames: string[];
	alreadyConfigured: boolean;
}

function isRootAgentType(type: string): boolean {
	return ROOT_AI_TYPES.has(type);
}

function isAnyLangchainNode(type: string): boolean {
	return type.startsWith(LANGCHAIN_TYPE_PREFIX);
}

// Returns true when the node's local name (after the prefix) starts with a
// known sub-component prefix. These nodes hang off a root and should not
// themselves be offered as evaluation targets.
function isLikelySubComponent(type: string): boolean {
	if (!type.startsWith(LANGCHAIN_TYPE_PREFIX)) return false;
	const localPart = type.slice(LANGCHAIN_TYPE_PREFIX.length).toLowerCase();
	return SUB_COMPONENT_PREFIXES.some((prefix) => localPart.startsWith(prefix));
}

export function detectAiNodes(workflow: WorkflowJSON): DetectAiNodesResult {
	const aiNodeNames: string[] = [];
	const fallbackCandidates: string[] = [];
	let alreadyConfigured = false;

	for (const node of workflow.nodes ?? []) {
		if (!node.name) continue;
		if (isRootAgentType(node.type)) {
			aiNodeNames.push(node.name);
		} else if (isAnyLangchainNode(node.type) && !isLikelySubComponent(node.type)) {
			// Catches future / less-common langchain root types not yet in
			// ROOT_AI_TYPES. Better to offer evals on a maybe-relevant workflow
			// than to silently skip a new model or chain variant.
			fallbackCandidates.push(node.name);
		}
		if (EVALUATION_TYPES.has(node.type)) {
			alreadyConfigured = true;
		}
	}

	// Primary root types always take priority. Fall back to unrecognised
	// langchain nodes only when no explicit root was found.
	const finalAiNodeNames = aiNodeNames.length > 0 ? aiNodeNames : fallbackCandidates;

	return {
		isAiWorkflow: finalAiNodeNames.length > 0,
		aiNodeNames: finalAiNodeNames,
		alreadyConfigured,
	};
}
