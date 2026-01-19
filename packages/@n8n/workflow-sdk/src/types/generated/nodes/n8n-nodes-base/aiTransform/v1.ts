/**
 * AI Transform Node - Version 1
 * Modify data based on instructions written in plain english
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AiTransformV1Params {
/**
 * Provide instructions on how you want to transform the data, then click 'Generate code'. Use dot notation to refer to nested fields (e.g. address.street).
 */
		instructions?: unknown;
	codeGeneratedForPrompt?: unknown;
	jsCode?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface AiTransformV1NodeBase {
	type: 'n8n-nodes-base.aiTransform';
	version: 1;
}

export type AiTransformV1ParamsNode = AiTransformV1NodeBase & {
	config: NodeConfig<AiTransformV1Params>;
};

export type AiTransformV1Node = AiTransformV1ParamsNode;