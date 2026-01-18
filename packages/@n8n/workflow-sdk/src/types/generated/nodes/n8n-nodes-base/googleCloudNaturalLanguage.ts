/**
 * Google Cloud Natural Language Node Types
 *
 * Consume Google Cloud Natural Language API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlecloudnaturallanguage/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GoogleCloudNaturalLanguageV1DocumentAnalyzeSentimentConfig = {
	resource: 'document';
	operation: 'analyzeSentiment';
	/**
	 * The source of the document: a string containing the content or a Google Cloud Storage URI
	 * @default content
	 */
	source: 'content' | 'gcsContentUri' | Expression<string>;
	/**
	 * The content of the input in string format. Cloud audit logging exempt since it is based on user data.
	 */
	content: string | Expression<string>;
	/**
	 * The Google Cloud Storage URI where the file content is located. This URI must be of the form: &lt;code&gt;gs://bucket_name/object_name&lt;/code&gt;. For more details, see &lt;a href="https://cloud.google.com/storage/docs/reference-uris."&gt;reference&lt;/a&gt;.
	 */
	gcsContentUri: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GoogleCloudNaturalLanguageV1Params =
	GoogleCloudNaturalLanguageV1DocumentAnalyzeSentimentConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleCloudNaturalLanguageV1Credentials {
	googleCloudNaturalLanguageOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleCloudNaturalLanguageNode = {
	type: 'n8n-nodes-base.googleCloudNaturalLanguage';
	version: 1;
	config: NodeConfig<GoogleCloudNaturalLanguageV1Params>;
	credentials?: GoogleCloudNaturalLanguageV1Credentials;
};
