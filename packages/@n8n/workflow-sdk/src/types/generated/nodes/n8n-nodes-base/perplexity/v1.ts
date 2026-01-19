/**
 * Perplexity Node - Version 1
 * Interact with the Perplexity API to generate AI responses with citations
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PerplexityV1Config {
	resource?: unknown;
	operation?: 'complete' | Expression<string>;
/**
 * The model which will generate the completion
 * @displayOptions.show { resource: ["chat"], operation: ["complete"] }
 * @default sonar
 */
		model: 'sonar' | 'sonar-deep-research' | 'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro' | Expression<string>;
/**
 * Any optional system messages must be sent first, followed by alternating user and assistant messages
 * @displayOptions.show { resource: ["chat"], operation: ["complete"] }
 * @default {"message":[{"role":"user","content":""}]}
 */
		messages: {
		message?: Array<{
			/** The content of the message to be sent
			 */
			content?: string | Expression<string>;
			/** Role in shaping the model's response, it tells the model how it should behave and interact with the user
			 * @default user
			 */
			role?: 'assistant' | 'system' | 'user' | Expression<string>;
		}>;
	};
/**
 * Whether to return only essential fields (ID, citations, message)
 * @displayOptions.show { resource: ["chat"], operation: ["complete"] }
 * @default false
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PerplexityV1Credentials {
	perplexityApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PerplexityV1NodeBase {
	type: 'n8n-nodes-base.perplexity';
	version: 1;
	credentials?: PerplexityV1Credentials;
}

export type PerplexityV1Node = PerplexityV1NodeBase & {
	config: NodeConfig<PerplexityV1Config>;
};

export type PerplexityV1Node = PerplexityV1Node;