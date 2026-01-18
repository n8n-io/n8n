/**
 * MySQL Node Types
 *
 * Get, add and update data in MySQL
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mysql/
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

export interface MySqlV25Params {
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
	 * The table you want to work on
	 * @default {"mode":"list","value":""}
	 */
	table: ResourceLocatorValue;
	deleteCommand?: 'truncate' | 'delete' | 'drop' | Expression<string>;
	/**
	 * If not set, all rows will be selected
	 * @default {}
	 */
	where?: {
		values?: Array<{
			column?: string | Expression<string>;
			condition?:
				| 'equal'
				| '!='
				| 'LIKE'
				| '>'
				| '<'
				| '>='
				| '<='
				| 'IS NULL'
				| 'IS NOT NULL'
				| Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * How to combine the conditions defined in "Select Rows": AND requires all conditions to be true, OR requires at least one condition to be true
	 * @default AND
	 */
	combineConditions?: 'AND' | 'OR' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.
	 * @hint Consider using query parameters to prevent SQL injection attacks. Add them in the options below
	 */
	query: string | Expression<string>;
	/**
	 * Whether to map node input properties and the table data automatically or manually
	 * @default autoMapInputData
	 */
	dataMode?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	valuesToSend?: {
		values?: Array<{ column?: string | Expression<string>; value?: string | Expression<string> }>;
	};
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
	sort?: {
		values?: Array<{
			column?: string | Expression<string>;
			direction?: 'ASC' | 'DESC' | Expression<string>;
		}>;
	};
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/" target="_blank"&gt;expression&lt;/a&gt;
	 * @hint Used to find the correct row to update. Doesn't get changed.
	 */
	columnToMatchOn: string | Expression<string>;
	/**
	 * Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated
	 */
	valueToMatchOn?: string | Expression<string>;
}

export interface MySqlV1Params {
	operation?: 'executeQuery' | 'insert' | 'update' | Expression<string>;
	/**
	 * The SQL query to execute
	 */
	query: string | Expression<string>;
	/**
	 * Name of the table in which to insert data to
	 * @default {"mode":"list","value":""}
	 */
	table: ResourceLocatorValue;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows
	 */
	columns?: string | Expression<string>;
	/**
	 * Modifiers for INSERT statement
	 * @default {}
	 */
	options?: Record<string, unknown>;
	/**
	 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
	 * @default id
	 */
	updateKey: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MySqlV25Credentials {
	mySql: CredentialReference;
}

export interface MySqlV1Credentials {
	mySql: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MySqlV25Node = {
	type: 'n8n-nodes-base.mySql';
	version: 2 | 2.1 | 2.2 | 2.3 | 2.4 | 2.5;
	config: NodeConfig<MySqlV25Params>;
	credentials?: MySqlV25Credentials;
};

export type MySqlV1Node = {
	type: 'n8n-nodes-base.mySql';
	version: 1;
	config: NodeConfig<MySqlV1Params>;
	credentials?: MySqlV1Credentials;
};

export type MySqlNode = MySqlV25Node | MySqlV1Node;
