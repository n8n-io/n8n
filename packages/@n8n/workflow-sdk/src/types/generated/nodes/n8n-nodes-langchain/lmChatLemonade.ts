/**
 * Lemonade Chat Model Node Types
 *
 * Language Model Lemonade Chat
 * @subnodeType ai_languageModel
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatlemonade/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatLemonadeV1Params {
	/**
	 * The model which will generate the completion. Models are loaded and managed through the Lemonade server.
	 */
	model: string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatLemonadeV1Credentials {
	lemonadeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcLmChatLemonadeV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatLemonade';
	version: 1;
	config: NodeConfig<LcLmChatLemonadeV1Params>;
	credentials?: LcLmChatLemonadeV1Credentials;
	isTrigger: true;
};

export type LcLmChatLemonadeNode = LcLmChatLemonadeV1Node;
