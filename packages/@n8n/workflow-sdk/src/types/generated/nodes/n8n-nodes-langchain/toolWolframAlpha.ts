/**
 * Wolfram|Alpha Node Types
 *
 * Connects to WolframAlpha's computational intelligence engine.
 * @subnodeType ai_tool
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toolwolframalpha/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolWolframAlphaV1Params {}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcToolWolframAlphaV1Credentials {
	wolframAlphaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcToolWolframAlphaV1Node = {
	type: '@n8n/n8n-nodes-langchain.toolWolframAlpha';
	version: 1;
	config: NodeConfig<LcToolWolframAlphaV1Params>;
	credentials?: LcToolWolframAlphaV1Credentials;
	isTrigger: true;
};

export type LcToolWolframAlphaNode = LcToolWolframAlphaV1Node;
