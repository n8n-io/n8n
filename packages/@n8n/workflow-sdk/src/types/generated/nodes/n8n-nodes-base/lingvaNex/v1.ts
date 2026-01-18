/**
 * LingvaNex Node - Version 1
 * Consume LingvaNex API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LingvaNexV1Params {
	operation?: 'translate' | Expression<string>;
/**
 * The input text to translate
 * @displayOptions.show { operation: ["translate"] }
 */
		text: string | Expression<string>;
/**
 * The language to use for translation of the input text, set to one of the language codes listed in &lt;a href="https://cloud.google.com/translate/docs/languages"&gt;Language Support&lt;/a&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["translate"] }
 */
		translateTo: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LingvaNexV1Credentials {
	lingvaNexApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LingvaNexV1Node = {
	type: 'n8n-nodes-base.lingvaNex';
	version: 1;
	config: NodeConfig<LingvaNexV1Params>;
	credentials?: LingvaNexV1Credentials;
};