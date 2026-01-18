/**
 * Google BigQuery Node - Version 2.1
 * Consume Google BigQuery API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBigQueryV21Credentials {
	googleApi: CredentialReference;
	googleBigQueryOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleBigQueryV21Node = {
	type: 'n8n-nodes-base.googleBigQuery';
	version: 2.1;
	config: NodeConfig<GoogleBigQueryV21Params>;
	credentials?: GoogleBigQueryV21Credentials;
};