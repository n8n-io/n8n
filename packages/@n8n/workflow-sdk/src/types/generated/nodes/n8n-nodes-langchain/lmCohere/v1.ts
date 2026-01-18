/**
 * Cohere Model Node - Version 1
 * Language Model Cohere
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

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

export type LcLmCohereV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmCohere';
	version: 1;
	config: NodeConfig<LcLmCohereV1Params>;
	credentials?: LcLmCohereV1Credentials;
	isTrigger: true;
};