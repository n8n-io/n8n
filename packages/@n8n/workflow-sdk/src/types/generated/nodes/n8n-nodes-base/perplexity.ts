/**
 * Perplexity Node Types
 *
 * Interact with the Perplexity API to generate AI responses with citations
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/perplexity/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PerplexityV1Params {
	resource?: unknown;
	operation?: 'complete' | Expression<string>;
	/**
	 * The model which will generate the completion
	 * @default sonar
	 */
	model:
		| 'sonar'
		| 'sonar-deep-research'
		| 'sonar-pro'
		| 'sonar-reasoning'
		| 'sonar-reasoning-pro'
		| Expression<string>;
	/**
	 * Any optional system messages must be sent first, followed by alternating user and assistant messages
	 * @default {"message":[{"role":"user","content":""}]}
	 */
	messages: Record<string, unknown>;
	/**
	 * Whether to return only essential fields (ID, citations, message)
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

export type PerplexityV1Node = {
	type: 'n8n-nodes-base.perplexity';
	version: 1;
	config: NodeConfig<PerplexityV1Params>;
	credentials?: PerplexityV1Credentials;
};

export type PerplexityNode = PerplexityV1Node;
