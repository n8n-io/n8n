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
 * Per-root-type pinned item shape for the roots whose shape can't live in a
 * `__schema__` file at all: textClassifier is a pure input passthrough and
 * vendor nodes emit their API response. Every other root's shape (including
 * the parser-conditional Agent/ChainLlm variants) ships as
 * `__schema__/v<X>/output[.with-parser].json` in nodes-langchain — the prompt
 * embeds those via the schema lookup and only falls back to this prose when
 * no schema resolves (missing/stale package build).
 */
export function describeAiRootShape(nodeType: string): string {
	switch (nodeType) {
		case '@n8n/n8n-nodes-langchain.textClassifier':
			return 'the INPUT item passed through UNCHANGED (this node routes items to a category branch without reshaping them) — emit a plausible input item, no classification wrapper key.';
		default:
			if (VENDOR_AI_ROOT_NODE_TYPES.has(nodeType)) {
				return "a plausible vendor API response for the node's configured resource and operation — there is NO `output` wrapper key; mirror the vendor's response fields.";
			}
			return '`{ "json": { "output": "<final response text>" } }`.';
	}
}

/**
 * The single required object-typed property that wraps a root's structured
 * output (e.g. `output` for Agent and ChainLlm — the structured output
 * parser itself emits the `{ output: ... }` wrapper since parser v1.1), read
 * from a resolved `with-parser` `__schema__` variant. A root whose variant
 * declares no such property gets `undefined` and is never repaired.
 */
export function findEnvelopeKey(schema: Record<string, unknown> | undefined): string | undefined {
	if (!schema || typeof schema.properties !== 'object' || schema.properties === null) {
		return undefined;
	}
	const required: unknown[] = Array.isArray(schema.required) ? schema.required : [];
	const candidates = Object.entries(schema.properties as Record<string, unknown>).filter(
		([key, definition]) =>
			required.includes(key) &&
			typeof definition === 'object' &&
			definition !== null &&
			(definition as Record<string, unknown>).type === 'object',
	);
	return candidates.length === 1 ? candidates[0][0] : undefined;
}
