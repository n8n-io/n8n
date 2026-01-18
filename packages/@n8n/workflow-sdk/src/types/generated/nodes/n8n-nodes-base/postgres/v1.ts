/**
 * Postgres Node - Version 1
 * Get, add and update data in Postgres
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

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

export interface PostgresV1Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PostgresV1Node = {
	type: 'n8n-nodes-base.postgres';
	version: 1;
	config: NodeConfig<PostgresV1Params>;
	credentials?: PostgresV1Credentials;
};