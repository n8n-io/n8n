/**
 * Google Cloud Natural Language Node - Version 1
 * Consume Google Cloud Natural Language API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GoogleCloudNaturalLanguageV1DocumentAnalyzeSentimentConfig = {
	resource: 'document';
	operation: 'analyzeSentiment';
/**
 * The source of the document: a string containing the content or a Google Cloud Storage URI
 * @displayOptions.show { operation: ["analyzeSentiment"] }
 * @default content
 */
		source: 'content' | 'gcsContentUri' | Expression<string>;
/**
 * The content of the input in string format. Cloud audit logging exempt since it is based on user data.
 * @displayOptions.show { operation: ["analyzeSentiment"], source: ["content"] }
 */
		content: string | Expression<string>;
/**
 * The Google Cloud Storage URI where the file content is located. This URI must be of the form: &lt;code&gt;gs://bucket_name/object_name&lt;/code&gt;. For more details, see &lt;a href="https://cloud.google.com/storage/docs/reference-uris."&gt;reference&lt;/a&gt;.
 * @displayOptions.show { operation: ["analyzeSentiment"], source: ["gcsContentUri"] }
 */
		gcsContentUri: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleCloudNaturalLanguageV1Credentials {
	googleCloudNaturalLanguageOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleCloudNaturalLanguageV1NodeBase {
	type: 'n8n-nodes-base.googleCloudNaturalLanguage';
	version: 1;
	credentials?: GoogleCloudNaturalLanguageV1Credentials;
}

export type GoogleCloudNaturalLanguageV1DocumentAnalyzeSentimentNode = GoogleCloudNaturalLanguageV1NodeBase & {
	config: NodeConfig<GoogleCloudNaturalLanguageV1DocumentAnalyzeSentimentConfig>;
};

export type GoogleCloudNaturalLanguageV1Node = GoogleCloudNaturalLanguageV1DocumentAnalyzeSentimentNode;