/**
 * AWS Textract Node - Version 1
 * Sends data to Amazon Textract
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsTextractV1Config {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	operation?: 'analyzeExpense' | Expression<string>;
/**
 * The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.
 * @displayOptions.show { operation: ["analyzeExpense"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["analyzeExpense"] }
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
// Node Types
// ===========================================================================

interface AwsTextractV1NodeBase {
	type: 'n8n-nodes-base.awsTextract';
	version: 1;
	credentials?: AwsTextractV1Credentials;
}

export type AwsTextractV1Node = AwsTextractV1NodeBase & {
	config: NodeConfig<AwsTextractV1Config>;
};

export type AwsTextractV1Node = AwsTextractV1Node;