import { defineNode } from '@n8n/node-sdk';

/** Root AI nodes. Each sub-node brings its own credential, so this node has none. */
export const ai = defineNode({
	id: 'ai',
	displayName: 'AI',
	icon: 'node:basic-llm-chain',
	// Extraction is a prompt with a schema, and sentiment is a classification. The legacy agent
	// stays in search: no contract node supplies tools or memory yet.
	replaces: [
		'@n8n/n8n-nodes-langchain.chainLlm',
		'@n8n/n8n-nodes-langchain.textClassifier',
		'@n8n/n8n-nodes-langchain.informationExtractor',
		'@n8n/n8n-nodes-langchain.sentimentAnalysis',
	],
});
