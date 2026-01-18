/**
 * Postgres Node - Version 2.2
 * Get, add and update data in Postgres
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

export interface PostgresV22Params {
	resource?: unknown;
	operation?: 'deleteTable' | 'executeQuery' | 'insert' | 'upsert' | 'select' | 'update' | Expression<string>;
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
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PostgresV22Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PostgresV22Node = {
	type: 'n8n-nodes-base.postgres';
	version: 2.2;
	config: NodeConfig<PostgresV22Params>;
	credentials?: PostgresV22Credentials;
};