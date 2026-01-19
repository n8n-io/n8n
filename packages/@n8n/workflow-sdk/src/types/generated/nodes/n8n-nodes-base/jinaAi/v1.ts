/**
 * Jina AI Node - Version 1
 * Interact with Jina AI API
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


// ===========================================================================
// Output Types
// ===========================================================================

export type JinaAiV1ReaderReadOutput = {
	content?: string;
	description?: string;
	external?: {
		alternate?: {
			'https://techcrunch.com/feed/'?: {
				title?: string;
				type?: string;
			};
			'https://techcrunch.com/wp-json/oembed/1.0/embed?url=https%3A%2F%2Ftechcrunch.com%2F2025%2F09%2F26%2Fdiscover-how-developer-tools-are-shifting-fast-with-lauri-moore-and-david-cramer-at-techcrunch-disrupt-2025%2F'?: {
				title?: string;
				type?: string;
			};
			'https://techcrunch.com/wp-json/oembed/1.0/embed?url=https%3A%2F%2Ftechcrunch.com%2F2025%2F09%2F26%2Fdiscover-how-developer-tools-are-shifting-fast-with-lauri-moore-and-david-cramer-at-techcrunch-disrupt-2025%2F&format=xml'?: {
				title?: string;
				type?: string;
			};
			'https://techcrunch.com/wp-json/wp/v2/posts/3037224'?: {
				title?: string;
				type?: string;
			};
		};
		icon?: {
			'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png?w=192'?: {
				sizes?: string;
			};
			'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png?w=32'?: {
				sizes?: string;
			};
		};
	};
	metadata?: {
		description?: string;
		lang?: string;
		'og:locale'?: string;
		'og:type'?: string;
		'og:url'?: string;
	};
	title?: string;
	url?: string;
	usage?: {
		tokens?: number;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface JinaAiV1Credentials {
	jinaAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface JinaAiV1NodeBase {
	type: 'n8n-nodes-base.jinaAi';
	version: 1;
	credentials?: JinaAiV1Credentials;
}

export type JinaAiV1ReaderReadNode = JinaAiV1NodeBase & {
	config: NodeConfig<JinaAiV1ReaderReadConfig>;
	output?: JinaAiV1ReaderReadOutput;
};

export type JinaAiV1ReaderSearchNode = JinaAiV1NodeBase & {
	config: NodeConfig<JinaAiV1ReaderSearchConfig>;
};

export type JinaAiV1ResearchDeepResearchNode = JinaAiV1NodeBase & {
	config: NodeConfig<JinaAiV1ResearchDeepResearchConfig>;
};

export type JinaAiV1Node =
	| JinaAiV1ReaderReadNode
	| JinaAiV1ReaderSearchNode
	| JinaAiV1ResearchDeepResearchNode
	;