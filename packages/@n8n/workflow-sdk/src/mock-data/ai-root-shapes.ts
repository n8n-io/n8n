/**
 * AI root node types (Agent/Chain) and their pinned-item output shapes.
 * Keep in sync with new agent/chain types in `@n8n/n8n-nodes-langchain`.
 */

export const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

const AI_ROOT_NODE_TYPES = new Set<string>([
	AGENT_NODE_TYPE,
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainRetrievalQa',
	'@n8n/n8n-nodes-langchain.chainSummarization',
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
		default:
			return '`{ "json": { "output": "<final response text>" } }`.';
	}
}
