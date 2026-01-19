/**
 * Google Gemini Chat Model Node - Version 1
 * Chat Model Google Gemini
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatGoogleGeminiV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://developers.generativeai.google/api/rest/generativelanguage/models/list"&gt;Learn more&lt;/a&gt;.
 * @default models/gemini-2.5-flash
 */
		modelName?: string | Expression<string>;
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatGoogleGeminiV1Credentials {
	googlePalmApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatGoogleGeminiV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini';
	version: 1;
	credentials?: LcLmChatGoogleGeminiV1Credentials;
	isTrigger: true;
}

export type LcLmChatGoogleGeminiV1ParamsNode = LcLmChatGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcLmChatGoogleGeminiV1Params>;
};

export type LcLmChatGoogleGeminiV1Node = LcLmChatGoogleGeminiV1ParamsNode;