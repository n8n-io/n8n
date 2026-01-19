/**
 * Airtable Node - Version 1
 * Read, update, write and delete data from Airtable
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export type AirtableV1AirtableTokenApiConfig = {
	authentication: 'airtableTokenApi';
/**
 * The Airtable Base in which to operate on
 * @default {"mode":"url","value":""}
 */
		application: ResourceLocatorValue;
	table: ResourceLocatorValue;
/**
 * Whether all fields should be sent to Airtable or only specific ones
 * @displayOptions.show { operation: ["append"] }
 * @default true
 */
		addAllFields?: boolean | Expression<boolean>;
/**
 * The name of fields for which data should be sent to Airtable
 * @displayOptions.show { addAllFields: [false], operation: ["append"] }
 * @default []
 */
		fields: string | Expression<string>;
/**
 * ID of the record to delete
 * @displayOptions.show { operation: ["delete"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["list"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["list"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether the attachment fields define in 'Download Fields' will be downloaded
 * @displayOptions.show { operation: ["list"] }
 * @default false
 */
		downloadAttachments?: boolean | Expression<boolean>;
/**
 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.
 * @displayOptions.show { operation: ["list"], downloadAttachments: [true] }
 */
		downloadFieldNames: string | Expression<string>;
/**
 * Additional options which decide which records should be returned
 * @displayOptions.show { operation: ["list"] }
 * @default {}
 */
		additionalOptions?: Record<string, unknown>;
/**
 * Whether all fields should be sent to Airtable or only specific ones
 * @displayOptions.show { operation: ["update"] }
 * @default true
 */
		updateAllFields?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type AirtableV1AirtableOAuth2ApiConfig = {
	authentication: 'airtableOAuth2Api';
/**
 * The Airtable Base in which to operate on
 * @default {"mode":"url","value":""}
 */
		application: ResourceLocatorValue;
	table: ResourceLocatorValue;
/**
 * Whether all fields should be sent to Airtable or only specific ones
 * @displayOptions.show { operation: ["append"] }
 * @default true
 */
		addAllFields?: boolean | Expression<boolean>;
/**
 * The name of fields for which data should be sent to Airtable
 * @displayOptions.show { addAllFields: [false], operation: ["append"] }
 * @default []
 */
		fields: string | Expression<string>;
/**
 * ID of the record to delete
 * @displayOptions.show { operation: ["delete"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["list"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["list"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether the attachment fields define in 'Download Fields' will be downloaded
 * @displayOptions.show { operation: ["list"] }
 * @default false
 */
		downloadAttachments?: boolean | Expression<boolean>;
/**
 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.
 * @displayOptions.show { operation: ["list"], downloadAttachments: [true] }
 */
		downloadFieldNames: string | Expression<string>;
/**
 * Additional options which decide which records should be returned
 * @displayOptions.show { operation: ["list"] }
 * @default {}
 */
		additionalOptions?: Record<string, unknown>;
/**
 * Whether all fields should be sent to Airtable or only specific ones
 * @displayOptions.show { operation: ["update"] }
 * @default true
 */
		updateAllFields?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type AirtableV1AirtableApiConfig = {
	authentication: 'airtableApi';
/**
 * The Airtable Base in which to operate on
 * @default {"mode":"url","value":""}
 */
		application: ResourceLocatorValue;
	table: ResourceLocatorValue;
/**
 * Whether all fields should be sent to Airtable or only specific ones
 * @displayOptions.show { operation: ["append"] }
 * @default true
 */
		addAllFields?: boolean | Expression<boolean>;
/**
 * The name of fields for which data should be sent to Airtable
 * @displayOptions.show { addAllFields: [false], operation: ["append"] }
 * @default []
 */
		fields: string | Expression<string>;
/**
 * ID of the record to delete
 * @displayOptions.show { operation: ["delete"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["list"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["list"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether the attachment fields define in 'Download Fields' will be downloaded
 * @displayOptions.show { operation: ["list"] }
 * @default false
 */
		downloadAttachments?: boolean | Expression<boolean>;
/**
 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.
 * @displayOptions.show { operation: ["list"], downloadAttachments: [true] }
 */
		downloadFieldNames: string | Expression<string>;
/**
 * Additional options which decide which records should be returned
 * @displayOptions.show { operation: ["list"] }
 * @default {}
 */
		additionalOptions?: Record<string, unknown>;
/**
 * Whether all fields should be sent to Airtable or only specific ones
 * @displayOptions.show { operation: ["update"] }
 * @default true
 */
		updateAllFields?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type AirtableV1Params =
	| AirtableV1AirtableTokenApiConfig
	| AirtableV1AirtableOAuth2ApiConfig
	| AirtableV1AirtableApiConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AirtableV1Credentials {
	airtableApi: CredentialReference;
	airtableTokenApi: CredentialReference;
	airtableOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AirtableV1NodeBase {
	type: 'n8n-nodes-base.airtable';
	version: 1;
	credentials?: AirtableV1Credentials;
}

export type AirtableV1AirtableTokenApiNode = AirtableV1NodeBase & {
	config: NodeConfig<AirtableV1AirtableTokenApiConfig>;
};

export type AirtableV1AirtableOAuth2ApiNode = AirtableV1NodeBase & {
	config: NodeConfig<AirtableV1AirtableOAuth2ApiConfig>;
};

export type AirtableV1AirtableApiNode = AirtableV1NodeBase & {
	config: NodeConfig<AirtableV1AirtableApiConfig>;
};

export type AirtableV1Node =
	| AirtableV1AirtableTokenApiNode
	| AirtableV1AirtableOAuth2ApiNode
	| AirtableV1AirtableApiNode
	;