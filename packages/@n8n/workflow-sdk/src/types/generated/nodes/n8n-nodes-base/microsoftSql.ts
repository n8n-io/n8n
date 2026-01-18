/**
 * Microsoft SQL Node Types
 *
 * Get, add and update data in Microsoft SQL
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftsql/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MicrosoftSqlV11Params {
	operation?: 'executeQuery' | 'insert' | 'update' | 'delete' | Expression<string>;
	/**
	 * The SQL query to execute
	 */
	query: string | Expression<string>;
	/**
	 * Name of the table in which to insert data to
	 */
	table: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows
	 */
	columns?: string | Expression<string>;
	/**
	 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
	 * @default id
	 */
	updateKey: string | Expression<string>;
	/**
	 * Name of the property which decides which rows in the database should be deleted. Normally that would be "id".
	 * @default id
	 */
	deleteKey: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftSqlV11Credentials {
	microsoftSql: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MicrosoftSqlNode = {
	type: 'n8n-nodes-base.microsoftSql';
	version: 1 | 1.1;
	config: NodeConfig<MicrosoftSqlV11Params>;
	credentials?: MicrosoftSqlV11Credentials;
};
