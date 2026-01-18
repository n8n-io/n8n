/**
 * AWS Rekognition Node Types
 *
 * Sends data to AWS Rekognition
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awsrekognition/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsRekognitionV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	resource?: 'image' | Expression<string>;
	operation?: 'analyze' | Expression<string>;
	type?:
		| 'detectFaces'
		| 'detectLabels'
		| 'detectModerationLabels'
		| 'detectText'
		| 'recognizeCelebrity'
		| Expression<string>;
	/**
	 * Whether the image to analyze should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	binaryPropertyName: string | Expression<string>;
	/**
	 * Name of the S3 bucket
	 */
	bucket: string | Expression<string>;
	/**
	 * S3 object key name
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsRekognitionV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AwsRekognitionV1Node = {
	type: 'n8n-nodes-base.awsRekognition';
	version: 1;
	config: NodeConfig<AwsRekognitionV1Params>;
	credentials?: AwsRekognitionV1Credentials;
};

export type AwsRekognitionNode = AwsRekognitionV1Node;
