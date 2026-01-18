/**
 * AWS Transcribe Node Types
 *
 * Sends data to AWS Transcribe
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awstranscribe/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsTranscribeV1Params {
	resource?: 'transcriptionJob' | Expression<string>;
	operation?: 'create' | 'delete' | 'get' | 'getAll' | Expression<string>;
	/**
	 * The name of the job
	 */
	transcriptionJobName?: string | Expression<string>;
	/**
	 * The S3 object location of the input media file
	 */
	mediaFileUri?: string | Expression<string>;
	/**
	 * Whether to set this field to true to enable automatic language identification
	 * @default false
	 */
	detectLanguage?: boolean | Expression<boolean>;
	/**
	 * Language used in the input media file
	 * @default en-US
	 */
	languageCode?:
		| 'en-US'
		| 'en-GB'
		| 'de-DE'
		| 'en-IN'
		| 'en-IE'
		| 'ru-RU'
		| 'es-ES'
		| Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * By default, the response only contains metadata about the transcript. Enable this option to retrieve the transcript instead.
	 * @default true
	 */
	returnTranscript?: boolean | Expression<boolean>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsTranscribeV1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsTranscribeNode = {
	type: 'n8n-nodes-base.awsTranscribe';
	version: 1;
	config: NodeConfig<AwsTranscribeV1Params>;
	credentials?: AwsTranscribeV1Credentials;
};
