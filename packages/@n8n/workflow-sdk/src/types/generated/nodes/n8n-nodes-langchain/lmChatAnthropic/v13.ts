/**
 * Anthropic Chat Model Node - Version 1.3
 * Language Model Anthropic
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAnthropicV13Params {
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatAnthropicV13Credentials {
	anthropicApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcLmChatAnthropicV13Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic';
	version: 1.3;
	config: NodeConfig<LcLmChatAnthropicV13Params>;
	credentials?: LcLmChatAnthropicV13Credentials;
	isTrigger: true;
};