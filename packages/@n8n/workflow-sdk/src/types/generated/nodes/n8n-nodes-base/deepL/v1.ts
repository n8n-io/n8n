/**
 * DeepL Node - Version 1
 * Translate data using DeepL
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Translate data */
export type DeepLV1LanguageTranslateConfig = {
	resource: 'language';
	operation: 'translate';
/**
 * Input text to translate
 * @displayOptions.show { operation: ["translate"] }
 */
		text: string | Expression<string>;
/**
 * Language to translate to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["translate"] }
 */
		translateTo: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type DeepLV1LanguageTranslateOutput = {
	detected_source_language?: string;
	text?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface DeepLV1Credentials {
	deepLApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface DeepLV1NodeBase {
	type: 'n8n-nodes-base.deepL';
	version: 1;
	credentials?: DeepLV1Credentials;
}

export type DeepLV1LanguageTranslateNode = DeepLV1NodeBase & {
	config: NodeConfig<DeepLV1LanguageTranslateConfig>;
	output?: DeepLV1LanguageTranslateOutput;
};

export type DeepLV1Node = DeepLV1LanguageTranslateNode;