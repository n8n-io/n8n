/**
 * MySQL Node - Version 1
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

export interface MySqlV1Params {
	operation?: 'executeQuery' | 'insert' | 'update' | Expression<string>;
/**
 * The SQL query to execute
 * @displayOptions.show { operation: ["executeQuery"] }
 */
		query: string | Expression<string>;
/**
 * Name of the table in which to insert data to
 * @displayOptions.show { operation: ["insert"] }
 * @default {"mode":"list","value":""}
 */
		table: ResourceLocatorValue;
/**
 * Comma-separated list of the properties which should used as columns for the new rows
 * @displayOptions.show { operation: ["insert"] }
 */
		columns?: string | Expression<string>;
/**
 * Modifiers for INSERT statement
 * @displayOptions.show { operation: ["insert"] }
 * @default {}
 */
		options?: Record<string, unknown>;
/**
 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
 * @displayOptions.show { operation: ["update"] }
 * @default id
 */
		updateKey: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MySqlV1Credentials {
	mySql: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MySqlV1Node = {
	type: 'n8n-nodes-base.mySql';
	version: 1;
	config: NodeConfig<MySqlV1Params>;
	credentials?: MySqlV1Credentials;
};