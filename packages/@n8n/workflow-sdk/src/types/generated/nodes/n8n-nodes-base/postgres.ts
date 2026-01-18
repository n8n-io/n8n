/**
 * Postgres Node Types
 *
 * Get, add and update data in Postgres
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/postgres/
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

export interface PostgresV26Params {
	resource?: unknown;
	operation?:
		| 'deleteTable'
		| 'executeQuery'
		| 'insert'
		| 'upsert'
		| 'select'
		| 'update'
		| Expression<string>;
	/**
	 * The schema that contains the table you want to work on
	 * @default {"mode":"list","value":"public"}
	 */
	schema: ResourceLocatorValue;
	/**
	 * The table you want to work on
	 * @default {"mode":"list","value":""}
	 */
	table: ResourceLocatorValue;
	deleteCommand?: 'truncate' | 'delete' | 'drop' | Expression<string>;
	/**
	 * Whether to reset identity (auto-increment) columns to their initial values
	 * @default false
	 */
	restartSequences?: boolean | Expression<boolean>;
	/**
	 * If not set, all rows will be selected
	 * @default {}
	 */
	where?: Record<string, unknown>;
	/**
	 * How to combine the conditions defined in "Select Rows": AND requires all conditions to be true, OR requires at least one condition to be true
	 * @default AND
	 */
	combineConditions?: 'AND' | 'OR' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.
	 */
	query: string | Expression<string>;
	/**
	 * Whether to map node input properties and the table data automatically or manually
	 * @default autoMapInputData
	 */
	dataMode?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	valuesToSend?: Record<string, unknown>;
	columns: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	sort?: Record<string, unknown>;
	/**
	 * The column to compare when finding the rows to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/" target="_blank"&gt;expression&lt;/a&gt;.
	 */
	columnToMatchOn: string | Expression<string>;
	/**
	 * Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated
	 */
	valueToMatchOn?: string | Expression<string>;
}

export interface PostgresV1Params {
	operation?: 'executeQuery' | 'insert' | 'update' | Expression<string>;
	/**
	 * The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.
	 */
	query: string | Expression<string>;
	/**
	 * Name of the schema the table belongs to
	 * @default public
	 */
	schema: string | Expression<string>;
	/**
	 * Name of the table in which to insert data to
	 */
	table: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows. You can use type casting with colons (:) like id:int.
	 */
	columns?: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which decides which rows in the database should be updated. Normally that would be "id".
	 * @default id
	 */
	updateKey: string | Expression<string>;
	/**
	 * Comma-separated list of the fields that the operation will return
	 * @default *
	 */
	returnFields?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PostgresV26Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PostgresNode = {
	type: 'n8n-nodes-base.postgres';
	version: 1 | 2 | 2.1 | 2.2 | 2.3 | 2.4 | 2.5 | 2.6;
	config: NodeConfig<PostgresV26Params>;
	credentials?: PostgresV26Credentials;
};
