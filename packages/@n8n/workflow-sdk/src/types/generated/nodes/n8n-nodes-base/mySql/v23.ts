/**
 * MySQL Node - Version 2.3
 * Get, add and update data in MySQL
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

export interface MySqlV23Params {
	resource?: unknown;
	operation?: 'deleteTable' | 'executeQuery' | 'insert' | 'upsert' | 'select' | 'update' | Expression<string>;
/**
 * The table you want to work on
 * @displayOptions.hide { operation: ["executeQuery"] }
 * @default {"mode":"list","value":""}
 */
		table: ResourceLocatorValue;
	deleteCommand?: 'truncate' | 'delete' | 'drop' | Expression<string>;
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
			condition?: 'equal' | '!=' | 'LIKE' | '>' | '<' | '>=' | '<=' | 'IS NULL' | 'IS NOT NULL' | Expression<string>;
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
 * @displayOptions.show { resource: ["database"], operation: ["insert"] }
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
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/" target="_blank"&gt;expression&lt;/a&gt;
 * @hint Used to find the correct row to update. Doesn't get changed.
 * @displayOptions.show { resource: ["database"], operation: ["update"] }
 * @displayOptions.hide { table: [""] }
 */
		columnToMatchOn: string | Expression<string>;
/**
 * Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated
 * @displayOptions.show { dataMode: ["defineBelow"], resource: ["database"], operation: ["update"] }
 * @displayOptions.hide { table: [""] }
 */
		valueToMatchOn?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MySqlV23Credentials {
	mySql: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MySqlV23Node = {
	type: 'n8n-nodes-base.mySql';
	version: 2.3;
	config: NodeConfig<MySqlV23Params>;
	credentials?: MySqlV23Credentials;
};