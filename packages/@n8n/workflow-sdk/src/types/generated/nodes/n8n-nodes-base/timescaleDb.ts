/**
 * TimescaleDB Node Types
 *
 * Add and update data in TimescaleDB
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/timescaledb/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TimescaleDbV1Params {
	operation?: 'executeQuery' | 'insert' | 'update' | Expression<string>;
	/**
	 * The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.
	 */
	query: string | Expression<string>;
	/**
	 * Name of the schema the table belongs to
	 * @default public
	 */
	schema: string | Expression<string>;
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
	 * Comma-separated list of the fields that the operation will return
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

export type TimescaleDbV1Node = {
	type: 'n8n-nodes-base.timescaleDb';
	version: 1;
	config: NodeConfig<TimescaleDbV1Params>;
	credentials?: TimescaleDbV1Credentials;
};

export type TimescaleDbNode = TimescaleDbV1Node;
