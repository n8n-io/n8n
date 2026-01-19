/**
 * Snowflake Node - Version 1
 * Get, add and update data in Snowflake
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SnowflakeV1Config {
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

interface SnowflakeV1NodeBase {
	type: 'n8n-nodes-base.snowflake';
	version: 1;
	credentials?: SnowflakeV1Credentials;
}

export type SnowflakeV1Node = SnowflakeV1NodeBase & {
	config: NodeConfig<SnowflakeV1Config>;
};

export type SnowflakeV1Node = SnowflakeV1Node;