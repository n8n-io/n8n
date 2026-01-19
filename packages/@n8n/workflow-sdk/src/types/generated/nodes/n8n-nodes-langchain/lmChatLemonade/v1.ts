/**
 * Lemonade Chat Model Node - Version 1
 * Language Model Lemonade Chat
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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

interface LcLmChatLemonadeV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatLemonade';
	version: 1;
	credentials?: LcLmChatLemonadeV1Credentials;
	isTrigger: true;
}

export type LcLmChatLemonadeV1ParamsNode = LcLmChatLemonadeV1NodeBase & {
	config: NodeConfig<LcLmChatLemonadeV1Params>;
};

export type LcLmChatLemonadeV1Node = LcLmChatLemonadeV1ParamsNode;