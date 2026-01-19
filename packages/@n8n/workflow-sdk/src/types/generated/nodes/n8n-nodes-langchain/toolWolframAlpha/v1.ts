/**
 * Wolfram|Alpha Node - Version 1
 * Connects to WolframAlpha's computational intelligence engine.
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
// Node Types
// ===========================================================================

interface LcToolWolframAlphaV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolWolframAlpha';
	version: 1;
	credentials?: LcToolWolframAlphaV1Credentials;
	isTrigger: true;
}

export type LcToolWolframAlphaV1ParamsNode = LcToolWolframAlphaV1NodeBase & {
	config: NodeConfig<LcToolWolframAlphaV1Params>;
};

export type LcToolWolframAlphaV1Node = LcToolWolframAlphaV1ParamsNode;