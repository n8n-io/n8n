/**
 * Jina AI Node - Version 1
 * Interact with Jina AI API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Fetches content from a URL and converts it to clean, LLM-friendly formats */
export type JinaAiV1ReaderReadConfig = {
	resource: 'reader';
	operation: 'read';
/**
 * The URL to fetch content from
 * @displayOptions.show { resource: ["reader"], operation: ["read"] }
 */
		url: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["reader"], operation: ["read"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Performs a web search via Jina AI and returns top results as clean, LLM-friendly formats */
export type JinaAiV1ReaderSearchConfig = {
	resource: 'reader';
	operation: 'search';
	searchQuery: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["reader"], operation: ["search"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Research a topic and generate a structured research report */
export type JinaAiV1ResearchDeepResearchConfig = {
	resource: 'research';
	operation: 'deepResearch';
/**
 * The topic or question for the AI to research
 * @displayOptions.show { resource: ["research"], operation: ["deepResearch"] }
 */
		researchQuery: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["research"], operation: ["deepResearch"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type JinaAiV1Params =
	| JinaAiV1ReaderReadConfig
	| JinaAiV1ReaderSearchConfig
	| JinaAiV1ResearchDeepResearchConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface JinaAiV1Credentials {
	jinaAiApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type JinaAiV1Node = {
	type: 'n8n-nodes-base.jinaAi';
	version: 1;
	config: NodeConfig<JinaAiV1Params>;
	credentials?: JinaAiV1Credentials;
};