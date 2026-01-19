/**
 * OpenAI Chat Model Node - Version 1
 * For advanced usage with an AI chain
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatOpenAiV1Config {
/**
 * The model which will generate the completion. &lt;a href="https://beta.openai.com/docs/models/overview"&gt;Learn more&lt;/a&gt;.
 * @default gpt-5-mini
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

export interface LcLmChatOpenAiV1Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatOpenAiV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatOpenAi';
	version: 1;
	credentials?: LcLmChatOpenAiV1Credentials;
	isTrigger: true;
}

export type LcLmChatOpenAiV1Node = LcLmChatOpenAiV1NodeBase & {
	config: NodeConfig<LcLmChatOpenAiV1Config>;
};

export type LcLmChatOpenAiV1Node = LcLmChatOpenAiV1Node;