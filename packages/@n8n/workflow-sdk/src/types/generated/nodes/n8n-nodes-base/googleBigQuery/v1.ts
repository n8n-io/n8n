/**
 * Google BigQuery Node - Version 1
 * Consume Google BigQuery API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new record */
export type GoogleBigQueryV1RecordCreateConfig = {
	resource: 'record';
	operation: 'create';
/**
 * ID of the project to create the record in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["record"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of the dataset to create the record in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["record"] }
 */
		datasetId: string | Expression<string>;
/**
 * ID of the table to create the record in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["record"] }
 */
		tableId: string | Expression<string>;
/**
 * Comma-separated list of the item properties to use as columns
 * @displayOptions.show { resource: ["record"], operation: ["create"] }
 */
		columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve many records */
export type GoogleBigQueryV1RecordGetAllConfig = {
	resource: 'record';
	operation: 'getAll';
/**
 * ID of the project to retrieve all rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["record"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of the dataset to retrieve all rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["record"] }
 */
		datasetId: string | Expression<string>;
/**
 * ID of the table to retrieve all rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["record"] }
 */
		tableId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["record"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["record"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["record"], operation: ["getAll"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type GoogleBigQueryV1Params =
	| GoogleBigQueryV1RecordCreateConfig
	| GoogleBigQueryV1RecordGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBigQueryV1Credentials {
	googleApi: CredentialReference;
	googleBigQueryOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleBigQueryV1Node = {
	type: 'n8n-nodes-base.googleBigQuery';
	version: 1;
	config: NodeConfig<GoogleBigQueryV1Params>;
	credentials?: GoogleBigQueryV1Credentials;
};