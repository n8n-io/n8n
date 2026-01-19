/**
 * AWS Comprehend Node - Version 1
 * Sends data to Amazon Comprehend
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsComprehendV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
/**
 * The resource to perform
 * @default text
 */
		resource?: 'text' | Expression<string>;
	operation?: 'detectDominantLanguage' | 'detectEntities' | 'detectSentiment' | Expression<string>;
/**
 * The language code for text
 * @displayOptions.show { resource: ["text"], operation: ["detectSentiment", "detectEntities"] }
 * @default en
 */
		languageCode?: 'ar' | 'zh' | 'zh-TW' | 'en' | 'fr' | 'de' | 'hi' | 'it' | 'ja' | 'ko' | 'pt' | 'es' | Expression<string>;
/**
 * The text to send
 * @displayOptions.show { resource: ["text"] }
 */
		text?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["text"], operation: ["detectDominantLanguage"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsComprehendV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AwsComprehendV1NodeBase {
	type: 'n8n-nodes-base.awsComprehend';
	version: 1;
	credentials?: AwsComprehendV1Credentials;
}

export type AwsComprehendV1ParamsNode = AwsComprehendV1NodeBase & {
	config: NodeConfig<AwsComprehendV1Params>;
};

export type AwsComprehendV1Node = AwsComprehendV1ParamsNode;