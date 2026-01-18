/**
 * Wolfram|Alpha Node - Version 1
 * Connects to WolframAlpha's computational intelligence engine.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolWolframAlphaV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcToolWolframAlphaV1Credentials {
	wolframAlphaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcToolWolframAlphaV1Node = {
	type: '@n8n/n8n-nodes-langchain.toolWolframAlpha';
	version: 1;
	config: NodeConfig<LcToolWolframAlphaV1Params>;
	credentials?: LcToolWolframAlphaV1Credentials;
	isTrigger: true;
};