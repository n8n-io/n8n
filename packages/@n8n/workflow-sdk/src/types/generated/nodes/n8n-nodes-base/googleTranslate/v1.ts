/**
 * Google Translate Node - Version 1
 * Translate data using Google Translate
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Translate data */
export type GoogleTranslateV1LanguageTranslateConfig = {
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

export type GoogleTranslateV1Params =
	| GoogleTranslateV1LanguageTranslateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleTranslateV1Credentials {
	googleApi: CredentialReference;
	googleTranslateOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleTranslateV1NodeBase {
	type: 'n8n-nodes-base.googleTranslate';
	version: 1;
	credentials?: GoogleTranslateV1Credentials;
}

export type GoogleTranslateV1LanguageTranslateNode = GoogleTranslateV1NodeBase & {
	config: NodeConfig<GoogleTranslateV1LanguageTranslateConfig>;
};

export type GoogleTranslateV1Node = GoogleTranslateV1LanguageTranslateNode;