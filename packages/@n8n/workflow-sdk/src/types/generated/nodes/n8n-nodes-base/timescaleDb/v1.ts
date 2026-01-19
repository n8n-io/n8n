/**
 * TimescaleDB Node - Version 1
 * Add and update data in TimescaleDB
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TimescaleDbV1Config {
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

export interface TimescaleDbV1Credentials {
	timescaleDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TimescaleDbV1NodeBase {
	type: 'n8n-nodes-base.timescaleDb';
	version: 1;
	credentials?: TimescaleDbV1Credentials;
}

export type TimescaleDbV1Node = TimescaleDbV1NodeBase & {
	config: NodeConfig<TimescaleDbV1Config>;
};

export type TimescaleDbV1Node = TimescaleDbV1Node;