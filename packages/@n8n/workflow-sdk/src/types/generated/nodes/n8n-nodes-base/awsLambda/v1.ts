/**
 * AWS Lambda Node - Version 1
 * Invoke functions on AWS Lambda
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsLambdaV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	operation?: 'invoke' | Expression<string>;
/**
 * The function you want to invoke. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["invoke"] }
 */
		'function': string | Expression<string>;
/**
 * Specify a version or alias to invoke a published version of the function
 * @displayOptions.show { operation: ["invoke"] }
 * @default $LATEST
 */
		qualifier: string | Expression<string>;
/**
 * Specify if the workflow should wait for the function to return the results
 * @displayOptions.show { operation: ["invoke"] }
 * @default RequestResponse
 */
		invocationType?: 'RequestResponse' | 'Event' | Expression<string>;
/**
 * The JSON that you want to provide to your Lambda function as input
 * @displayOptions.show { operation: ["invoke"] }
 */
		payload?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsLambdaV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsLambdaV1Node = {
	type: 'n8n-nodes-base.awsLambda';
	version: 1;
	config: NodeConfig<AwsLambdaV1Params>;
	credentials?: AwsLambdaV1Credentials;
};