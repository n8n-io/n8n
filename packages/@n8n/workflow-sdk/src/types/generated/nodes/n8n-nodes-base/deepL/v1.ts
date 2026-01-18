/**
 * DeepL Node - Version 1
 * Translate data using DeepL
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type DeepLV1Params =
	| DeepLV1LanguageTranslateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface DeepLV1Credentials {
	deepLApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type DeepLV1Node = {
	type: 'n8n-nodes-base.deepL';
	version: 1;
	config: NodeConfig<DeepLV1Params>;
	credentials?: DeepLV1Credentials;
};