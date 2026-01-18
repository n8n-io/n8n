/**
 * Snowflake Node Types
 *
 * Get, add and update data in Snowflake
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/snowflake/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SnowflakeV1Params {
	operation?: 'executeQuery' | 'insert' | 'update' | Expression<string>;
	/**
	 * The SQL query to execute
	 * @displayOptions.show { operation: ["executeQuery"] }
	 */
	query: string | Expression<string>;
	/**
	 * Name of the table in which to insert data to
	 * @displayOptions.show { operation: ["insert"] }
	 */
	table: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows
	 * @displayOptions.show { operation: ["insert"] }
	 */
	columns?: string | Expression<string>;
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

export interface SnowflakeV1Credentials {
	snowflake: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SnowflakeV1Node = {
	type: 'n8n-nodes-base.snowflake';
	version: 1;
	config: NodeConfig<SnowflakeV1Params>;
	credentials?: SnowflakeV1Credentials;
};

export type SnowflakeNode = SnowflakeV1Node;
