/**
 * LingvaNex Node - Version 1
 * Consume LingvaNex API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LingvaNexV1Config {
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
// Node Types
// ===========================================================================

interface LingvaNexV1NodeBase {
	type: 'n8n-nodes-base.lingvaNex';
	version: 1;
	credentials?: LingvaNexV1Credentials;
}

export type LingvaNexV1Node = LingvaNexV1NodeBase & {
	config: NodeConfig<LingvaNexV1Config>;
};

export type LingvaNexV1Node = LingvaNexV1Node;