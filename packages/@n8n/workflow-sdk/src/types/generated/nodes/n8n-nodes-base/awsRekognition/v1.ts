/**
 * AWS Rekognition Node - Version 1
 * Sends data to AWS Rekognition
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsRekognitionV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	resource?: 'image' | Expression<string>;
	operation?: 'analyze' | Expression<string>;
	type?: 'detectFaces' | 'detectLabels' | 'detectModerationLabels' | 'detectText' | 'recognizeCelebrity' | Expression<string>;
/**
 * Whether the image to analyze should be taken from binary field
 * @displayOptions.show { operation: ["analyze"], resource: ["image"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
	binaryPropertyName: string | Expression<string>;
/**
 * Name of the S3 bucket
 * @displayOptions.show { operation: ["analyze"], resource: ["image"], binaryData: [false] }
 */
		bucket: string | Expression<string>;
/**
 * S3 object key name
 * @displayOptions.show { operation: ["analyze"], resource: ["image"], binaryData: [false] }
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

interface AwsRekognitionV1NodeBase {
	type: 'n8n-nodes-base.awsRekognition';
	version: 1;
	credentials?: AwsRekognitionV1Credentials;
}

export type AwsRekognitionV1ParamsNode = AwsRekognitionV1NodeBase & {
	config: NodeConfig<AwsRekognitionV1Params>;
};

export type AwsRekognitionV1Node = AwsRekognitionV1ParamsNode;