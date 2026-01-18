/**
 * Mistral Cloud Chat Model Node Types
 *
 * For advanced usage with an AI chain
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatmistralcloud/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatMistralCloudV1Params {
	/**
	 * The model which will generate the completion. &lt;a href="https://docs.mistral.ai/platform/endpoints/"&gt;Learn more&lt;/a&gt;.
	 * @default mistral-small
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

export interface LcLmChatMistralCloudV1Credentials {
	mistralCloudApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcLmChatMistralCloudNode = {
	type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud';
	version: 1;
	config: NodeConfig<LcLmChatMistralCloudV1Params>;
	credentials?: LcLmChatMistralCloudV1Credentials;
	isTrigger: true;
};
