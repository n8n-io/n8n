/**
 * DeepSeek Chat Model Node - Version 1
 * For advanced usage with an AI chain
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatDeepSeekV1Config {
/**
 * The model which will generate the completion. &lt;a href="https://api-docs.deepseek.com/quick_start/pricing"&gt;Learn more&lt;/a&gt;.
 * @default deepseek-chat
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

export interface LcLmChatDeepSeekV1Credentials {
	deepSeekApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatDeepSeekV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek';
	version: 1;
	credentials?: LcLmChatDeepSeekV1Credentials;
	isTrigger: true;
}

export type LcLmChatDeepSeekV1Node = LcLmChatDeepSeekV1NodeBase & {
	config: NodeConfig<LcLmChatDeepSeekV1Config>;
};

export type LcLmChatDeepSeekV1Node = LcLmChatDeepSeekV1Node;