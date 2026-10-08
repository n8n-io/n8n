export const CODEX_AI_CATEGORY = 'AI';

export const CODEX_NODE_CATEGORIES = [
	'Data & Storage',
	'Finance & Accounting',
	'Marketing & Content',
	'Productivity',
	'Miscellaneous',
	'Sales',
	'Development',
	'Analytics',
	'Communication',
	'Utility',
	CODEX_AI_CATEGORY,
] as const;

export const CODEX_AI_SUBCATEGORIES = {
	AGENTS: 'Agents',
	CHAINS: 'Chains',
	LANGUAGE_MODELS: 'Language Models',
	MEMORY: 'Memory',
	OUTPUT_PARSERS: 'Output Parsers',
	TOOLS: 'Tools',
	VECTOR_STORES: 'Vector Stores',
	RETRIEVERS: 'Retrievers',
	RERANKERS: 'Rerankers',
	EMBEDDINGS: 'Embeddings',
	DOCUMENT_LOADERS: 'Document Loaders',
	TEXT_SPLITTERS: 'Text Splitters',
	OTHER_TOOLS: 'Other Tools',
	ROOT_NODES: 'Root Nodes',
	MODEL_CONTEXT_PROTOCOL: 'Model Context Protocol',
	HUMAN_IN_THE_LOOP: 'Human in the Loop',
	EVALUATION: 'Evaluation',
	MISCELLANEOUS: 'Miscellaneous',
} as const;
