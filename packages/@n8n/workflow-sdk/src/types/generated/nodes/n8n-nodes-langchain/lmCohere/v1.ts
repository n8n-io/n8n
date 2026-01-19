/**
 * Cohere Model Node - Version 1
 * Language Model Cohere
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
// Node Types
// ===========================================================================

interface LcLmCohereV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmCohere';
	version: 1;
	credentials?: LcLmCohereV1Credentials;
	isTrigger: true;
}

export type LcLmCohereV1ParamsNode = LcLmCohereV1NodeBase & {
	config: NodeConfig<LcLmCohereV1Params>;
};

export type LcLmCohereV1Node = LcLmCohereV1ParamsNode;