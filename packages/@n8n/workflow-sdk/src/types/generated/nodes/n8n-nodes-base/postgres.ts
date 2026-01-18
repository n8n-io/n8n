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
	 * @displayOptions.hide { operation: ["executeQuery"] }
	 * @default {"mode":"list","value":"public"}
	 */
	schema: ResourceLocatorValue;
	/**
	 * The table you want to work on
	 * @displayOptions.hide { operation: ["executeQuery"] }
	 * @default {"mode":"list","value":""}
	 */
	table: ResourceLocatorValue;
	deleteCommand?: 'truncate' | 'delete' | 'drop' | Expression<string>;
	/**
	 * Whether to reset identity (auto-increment) columns to their initial values
	 * @displayOptions.show { deleteCommand: ["truncate"], resource: ["database"], operation: ["deleteTable"] }
	 * @displayOptions.hide { table: [""] }
	 * @default false
	 */
	restartSequences?: boolean | Expression<boolean>;
	/**
	 * If not set, all rows will be selected
	 * @displayOptions.show { deleteCommand: ["delete"], resource: ["database"], operation: ["deleteTable"] }
	 * @displayOptions.hide { table: [""] }
	 * @default {}
	 */
	where?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/" target="_blank"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** The operator to check the column against. When using 'LIKE' operator percent sign ( %) matches zero or more characters, underscore ( _ ) matches any single character.
			 * @default equal
			 */
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
			/** Value
			 * @displayOptions.hide { condition: ["IS NULL", "IS NOT NULL"] }
			 */
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * How to combine the conditions defined in "Select Rows": AND requires all conditions to be true, OR requires at least one condition to be true
	 * @displayOptions.show { deleteCommand: ["delete"], resource: ["database"], operation: ["deleteTable"] }
	 * @displayOptions.hide { table: [""] }
	 * @default AND
	 */
	combineConditions?: 'AND' | 'OR' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.
	 * @hint Consider using query parameters to prevent SQL injection attacks. Add them in the options below
	 * @displayOptions.show { resource: ["database"], operation: ["executeQuery"] }
	 */
	query: string | Expression<string>;
	/**
	 * Whether to map node input properties and the table data automatically or manually
	 * @displayOptions.show { @version: [2, 2.1], resource: ["database"], operation: ["insert"] }
	 * @displayOptions.hide { table: [""] }
	 * @default autoMapInputData
	 */
	dataMode?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	valuesToSend?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/" target="_blank"&gt;expression&lt;/a&gt;
			 * @default []
			 */
			column?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	columns: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["database"], operation: ["select"] }
	 * @displayOptions.hide { table: [""] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["database"], operation: ["select"] }
	 * @displayOptions.hide { table: [""] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	sort?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/" target="_blank"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Direction
			 * @default ASC
			 */
			direction?: 'ASC' | 'DESC' | Expression<string>;
		}>;
	};
	/**
	 * The column to compare when finding the rows to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/" target="_blank"&gt;expression&lt;/a&gt;.
	 * @hint The column to use when matching rows in Postgres to the input items of this node. Usually an ID.
	 * @displayOptions.show { @version: [2, 2.1], resource: ["database"], operation: ["update"] }
	 * @displayOptions.hide { table: [""] }
	 */
	columnToMatchOn: string | Expression<string>;
	/**
	 * Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated
	 * @displayOptions.show { dataMode: ["defineBelow"], @version: [2, 2.1], resource: ["database"], operation: ["update"] }
	 * @displayOptions.hide { table: [""] }
	 */
	valueToMatchOn?: string | Expression<string>;
}

export interface PostgresV1Params {
	operation?: 'executeQuery' | 'insert' | 'update' | Expression<string>;
	/**
	 * The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.
	 * @displayOptions.show { operation: ["executeQuery"] }
	 */
	query: string | Expression<string>;
	/**
	 * Name of the schema the table belongs to
	 * @displayOptions.show { operation: ["insert"] }
	 * @default public
	 */
	schema: string | Expression<string>;
	/**
	 * Name of the table in which to insert data to
	 * @displayOptions.show { operation: ["insert"] }
	 */
	table: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows. You can use type casting with colons (:) like id:int.
	 * @displayOptions.show { operation: ["insert"] }
	 */
	columns?: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which decides which rows in the database should be updated. Normally that would be "id".
	 * @displayOptions.show { operation: ["update"] }
	 * @default id
	 */
	updateKey: string | Expression<string>;
	/**
	 * Comma-separated list of the fields that the operation will return
	 * @displayOptions.show { operation: ["insert", "update"] }
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

export interface PostgresV1Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type PostgresV26Node = {
	type: 'n8n-nodes-base.postgres';
	version: 2 | 2.1 | 2.2 | 2.3 | 2.4 | 2.5 | 2.6;
	config: NodeConfig<PostgresV26Params>;
	credentials?: PostgresV26Credentials;
};

export type PostgresV1Node = {
	type: 'n8n-nodes-base.postgres';
	version: 1;
	config: NodeConfig<PostgresV1Params>;
	credentials?: PostgresV1Credentials;
};

export type PostgresNode = PostgresV26Node | PostgresV1Node;
