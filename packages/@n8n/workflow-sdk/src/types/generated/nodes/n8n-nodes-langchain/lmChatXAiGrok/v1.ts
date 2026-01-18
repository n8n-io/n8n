/**
 * xAI Grok Chat Model Node - Version 1
 * For advanced usage with an AI chain
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatXAiGrokV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://docs.x.ai/docs/models"&gt;Learn more&lt;/a&gt;.
 * @default grok-2-vision-1212
 */
		model?: string | Expression<string>;
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatXAiGrokV1Credentials {
	xAiApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcLmChatXAiGrokV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatXAiGrok';
	version: 1;
	config: NodeConfig<LcLmChatXAiGrokV1Params>;
	credentials?: LcLmChatXAiGrokV1Credentials;
	isTrigger: true;
};