/**
 * Groq Chat Model Node - Version 1
 * Language Model Groq
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatGroqV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://console.groq.com/docs/models"&gt;Learn more&lt;/a&gt;.
 * @default llama3-8b-8192
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

export interface LcLmChatGroqV1Credentials {
	groqApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcLmChatGroqV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatGroq';
	version: 1;
	config: NodeConfig<LcLmChatGroqV1Params>;
	credentials?: LcLmChatGroqV1Credentials;
	isTrigger: true;
};