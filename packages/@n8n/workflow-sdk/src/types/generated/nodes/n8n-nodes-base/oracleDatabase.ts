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
	 * @default {"mode":"list","value":""}
	 */
	schema: ResourceLocatorValue;
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
	where?: Record<string, unknown>;
	/**
	 * How to combine the conditions defined in "Select Rows": AND requires all conditions to be true, OR requires at least one condition to be true
	 * @default AND
	 */
	combineConditions?: 'AND' | 'OR' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The SQL statement to execute. You can use n8n expressions and positional parameters like :1, :2, :3, or named parameters like :name, :ID, etc to refer to the 'Bind Variable Placeholder Values' set in options below.
	 * @hint Consider using bind parameters to prevent SQL injection attacks. Add them in the options below
	 */
	query: string | Expression<string>;
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
