/**
 * AI root node types (Agent/Chain/vendor LLM) and their pinned-item output
 * shapes. Keep in sync with new agent/chain types in
 * `@n8n/n8n-nodes-langchain` and with the editor's canonical list in
 * `editor-ui/src/features/ai/evaluation.ee/evaluation.constants.ts`.
 */

export const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

/**
 * Vendor API nodes (OpenAI, Anthropic, …): AI roots for detection purposes,
 * but their output is the vendor's API response shaped by the selected
 * resource/operation (and `simplify` toggles) — there is no stable wrapper
 * key to describe statically.
 */
const VENDOR_AI_ROOT_NODE_TYPES = new Set<string>([
	'@n8n/n8n-nodes-langchain.openAi',
	'@n8n/n8n-nodes-langchain.anthropic',
	'@n8n/n8n-nodes-langchain.googleGemini',
	'@n8n/n8n-nodes-langchain.ollama',
	'@n8n/n8n-nodes-langchain.alibabaCloud',
	'@n8n/n8n-nodes-langchain.miniMax',
	'@n8n/n8n-nodes-langchain.moonshot',
]);

const AI_ROOT_NODE_TYPES = new Set<string>([
	AGENT_NODE_TYPE,
	'@n8n/n8n-nodes-langchain.openAiAssistant',
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainRetrievalQa',
	'@n8n/n8n-nodes-langchain.chainSummarization',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
	...VENDOR_AI_ROOT_NODE_TYPES,
]);

export function isAiRootNodeType(nodeType: string): boolean {
	return AI_ROOT_NODE_TYPES.has(nodeType);
}

/**
 * Per-root-type pinned item shape. Verified against the node implementations:
 * Agent wraps in `output`; ChainLlm emits `{ text }` (or the parser's object
 * FLAT at the top level — `formatResponse` unwraps it); ChainRetrievalQa emits
 * `{ response }`; ChainSummarization emits `{ output: { output_text } }`.
 * Getting the key wrong silently breaks every downstream `$json.<key>`
 * reference (observed: chainLlm pinned with `output` → empty Slack digest).
 */
export function describeAiRootShape(nodeType: string, hasParser: boolean): string {
	switch (nodeType) {
		case AGENT_NODE_TYPE:
			return hasParser
				? '`{ "json": { "output": <parsed object> } }` — `output` is a parsed JSON object, NOT a JSON-encoded string, and its fields must NOT appear at the top level of `json`.'
				: '`{ "json": { "output": "<final response text>" } }` — `output` is a plain text STRING, never an object: downstream nodes interpolate it directly into messages.';
		case '@n8n/n8n-nodes-langchain.chainLlm':
			return hasParser
				? 'the parsed fields FLAT at the top level of `json` — chainLlm unwraps parser output, so there is NO `output` or `text` wrapper key.'
				: '`{ "json": { "text": "<final response text>" } }` — the key is `text` (chainLlm has NO `output` key), and it is a plain string.';
		case '@n8n/n8n-nodes-langchain.chainRetrievalQa':
			return '`{ "json": { "response": "<answer text>" } }` — the key is `response`, a plain string.';
		case '@n8n/n8n-nodes-langchain.chainSummarization':
			return '`{ "json": { "output": { "output_text": "<summary text>" } } }`.';
		case '@n8n/n8n-nodes-langchain.informationExtractor':
			return '`{ "json": { "output": <object of extracted fields> } }` — `output` is a parsed object matching the extraction attributes, never a string.';
		case '@n8n/n8n-nodes-langchain.textClassifier':
			return 'the INPUT item passed through UNCHANGED (this node routes items to a category branch without reshaping them) — emit a plausible input item, no classification wrapper key.';
		case '@n8n/n8n-nodes-langchain.sentimentAnalysis':
			return 'the INPUT item with an added `sentimentAnalysis` object — `{ "json": { ...original input fields, "sentimentAnalysis": { "category": "<sentiment>" } } }`.';
		default:
			if (VENDOR_AI_ROOT_NODE_TYPES.has(nodeType)) {
				return "a plausible vendor API response for the node's configured resource and operation — there is NO `output` wrapper key; mirror the vendor's response fields.";
			}
			return '`{ "json": { "output": "<final response text>" } }`.';
	}
}
