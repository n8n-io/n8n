/**
 * AWS Transcribe Node - Version 1
 * Sends data to AWS Transcribe
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsTranscribeV1Config {
	resource?: 'transcriptionJob' | Expression<string>;
	operation?: 'create' | 'delete' | 'get' | 'getAll' | Expression<string>;
/**
 * The name of the job
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["create", "get", "delete"] }
 */
		transcriptionJobName?: string | Expression<string>;
/**
 * The S3 object location of the input media file
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["create"] }
 */
		mediaFileUri?: string | Expression<string>;
/**
 * Whether to set this field to true to enable automatic language identification
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["create"] }
 * @default false
 */
		detectLanguage?: boolean | Expression<boolean>;
/**
 * Language used in the input media file
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["create"], detectLanguage: [false] }
 * @default en-US
 */
		languageCode?: 'en-US' | 'en-GB' | 'de-DE' | 'en-IN' | 'en-IE' | 'ru-RU' | 'es-ES' | Expression<string>;
	options?: Record<string, unknown>;
/**
 * By default, the response only contains metadata about the transcript. Enable this option to retrieve the transcript instead.
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["get"] }
 * @default true
 */
		returnTranscript?: boolean | Expression<boolean>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["get"], returnTranscript: [true] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["transcriptionJob"], operation: ["getAll"], returnAll: [false] }
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
// Node Types
// ===========================================================================

interface AwsTranscribeV1NodeBase {
	type: 'n8n-nodes-base.awsTranscribe';
	version: 1;
	credentials?: AwsTranscribeV1Credentials;
}

export type AwsTranscribeV1Node = AwsTranscribeV1NodeBase & {
	config: NodeConfig<AwsTranscribeV1Config>;
};

export type AwsTranscribeV1Node = AwsTranscribeV1Node;