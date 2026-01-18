/**
 * Google Gemini Chat Model Node Types
 *
 * Chat Model Google Gemini
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatgooglegemini/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
// Node Type
// ===========================================================================

export type LcLmChatGoogleGeminiNode = {
	type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini';
	version: 1;
	config: NodeConfig<LcLmChatGoogleGeminiV1Params>;
	credentials?: LcLmChatGoogleGeminiV1Credentials;
	isTrigger: true;
};
