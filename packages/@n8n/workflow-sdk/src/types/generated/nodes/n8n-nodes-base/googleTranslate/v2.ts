/**
 * Google Translate Node - Version 2
 * Translate data using Google Translate
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Translate data */
export type GoogleTranslateV2LanguageTranslateConfig = {
	resource: 'language';
	operation: 'translate';
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
};

export type GoogleTranslateV2Params =
	| GoogleTranslateV2LanguageTranslateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleTranslateV2Credentials {
	googleApi: CredentialReference;
	googleTranslateOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleTranslateV2NodeBase {
	type: 'n8n-nodes-base.googleTranslate';
	version: 2;
	credentials?: GoogleTranslateV2Credentials;
}

export type GoogleTranslateV2LanguageTranslateNode = GoogleTranslateV2NodeBase & {
	config: NodeConfig<GoogleTranslateV2LanguageTranslateConfig>;
};

export type GoogleTranslateV2Node = GoogleTranslateV2LanguageTranslateNode;