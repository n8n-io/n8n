/**
 * Oracle Database Node Types
 *
 * Get, add and update data in Oracle database
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/oracledatabase/
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

export interface OracleDatabaseV1Params {
	resource?: unknown;
	operation?:
		| 'deleteTable'
		| 'execute'
		| 'insert'
		| 'upsert'
		| 'select'
		| 'update'
		| Expression<string>;
	/**
	 * The schema that contains the table you want to work on
	 * @displayOptions.hide { operation: ["execute"] }
	 * @default {"mode":"list","value":""}
	 */
	schema: ResourceLocatorValue;
	/**
	 * The table you want to work on
	 * @displayOptions.hide { operation: ["execute"] }
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
			/** Parameters to pass to the tool as JSON or string
			 * @displayOptions.hide { condition: ["IS NULL", "IS NOT NULL"] }
			 * @default {"key": "val"}
			 */
			value?: IDataObject | string | Expression<string>;
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
	 * The SQL statement to execute. You can use n8n expressions and positional parameters like :1, :2, :3, or named parameters like :name, :ID, etc to refer to the 'Bind Variable Placeholder Values' set in options below.
	 * @hint Consider using bind parameters to prevent SQL injection attacks. Add them in the options below
	 * @displayOptions.show { resource: ["database"], operation: ["execute"] }
	 */
	query: string | Expression<string>;
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
	 * @displayOptions.show { resource: ["database"], operation: ["select"], returnAll: [false] }
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

export interface OracleDatabaseV1Credentials {
	oracleDBApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type OracleDatabaseV1Node = {
	type: 'n8n-nodes-base.oracleDatabase';
	version: 1;
	config: NodeConfig<OracleDatabaseV1Params>;
	credentials?: OracleDatabaseV1Credentials;
};

export type OracleDatabaseNode = OracleDatabaseV1Node;
