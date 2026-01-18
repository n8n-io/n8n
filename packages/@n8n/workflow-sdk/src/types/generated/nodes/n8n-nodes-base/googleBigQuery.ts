/**
 * Google BigQuery Node Types
 *
 * Consume Google BigQuery API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlebigquery/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface GoogleBigQueryV21Params {
	authentication?: 'oAuth2' | 'serviceAccount' | Expression<string>;
	resource?: unknown;
	operation?: 'executeQuery' | 'insert' | Expression<string>;
	/**
	 * Projects to which you have been granted any project role
	 * @displayOptions.show { resource: ["database"], operation: ["executeQuery", "insert"] }
	 * @default {"mode":"list","value":""}
	 */
	projectId: ResourceLocatorValue;
	datasetId: ResourceLocatorValue;
	tableId: ResourceLocatorValue;
	/**
	 * SQL query to execute, you can find more information &lt;a href="https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax" target="_blank"&gt;here&lt;/a&gt;. Standard SQL syntax used by default, but you can also use Legacy SQL syntax by using optinon 'Use Legacy SQL'.
	 * @displayOptions.show { resource: ["database"], operation: ["executeQuery"] }
	 * @displayOptions.hide { /options.useLegacySql: [true] }
	 */
	sqlQuery?: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @displayOptions.show { resource: ["database"], operation: ["insert"] }
	 * @default autoMap
	 */
	dataMode?: 'autoMap' | 'define' | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldId?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
}

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
	| GoogleBigQueryV1RecordGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBigQueryV21Credentials {
	googleApi: CredentialReference;
	googleBigQueryOAuth2Api: CredentialReference;
}

export interface GoogleBigQueryV1Credentials {
	googleApi: CredentialReference;
	googleBigQueryOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleBigQueryV21Node = {
	type: 'n8n-nodes-base.googleBigQuery';
	version: 2 | 2.1;
	config: NodeConfig<GoogleBigQueryV21Params>;
	credentials?: GoogleBigQueryV21Credentials;
};

export type GoogleBigQueryV1Node = {
	type: 'n8n-nodes-base.googleBigQuery';
	version: 1;
	config: NodeConfig<GoogleBigQueryV1Params>;
	credentials?: GoogleBigQueryV1Credentials;
};

export type GoogleBigQueryNode = GoogleBigQueryV21Node | GoogleBigQueryV1Node;
