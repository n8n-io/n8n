/**
 * Anthropic Chat Model Node - Version 1.2
 * Language Model Anthropic
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAnthropicV12Params {
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatAnthropicV12Credentials {
	anthropicApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcLmChatAnthropicV12Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic';
	version: 1.2;
	config: NodeConfig<LcLmChatAnthropicV12Params>;
	credentials?: LcLmChatAnthropicV12Credentials;
	isTrigger: true;
};