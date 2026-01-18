/**
 * AWS Textract Node Types
 *
 * Sends data to Amazon Textract
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awstextract/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsTextractV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	operation?: 'analyzeExpense' | Expression<string>;
	/**
	 * The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsTextractV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsTextractNode = {
	type: 'n8n-nodes-base.awsTextract';
	version: 1;
	config: NodeConfig<AwsTextractV1Params>;
	credentials?: AwsTextractV1Credentials;
};
