/**
 * Cohere Model Node Types
 *
 * Language Model Cohere
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmcohere/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmCohereV1Params {
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmCohereV1Credentials {
	cohereApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcLmCohereNode = {
	type: '@n8n/n8n-nodes-langchain.lmCohere';
	version: 1;
	config: NodeConfig<LcLmCohereV1Params>;
	credentials?: LcLmCohereV1Credentials;
	isTrigger: true;
};
