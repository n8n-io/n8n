/**
 * QuestDB Node Types
 *
 * Get, add and update data in QuestDB
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/questdb/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface QuestDbV1Params {
	operation?: 'executeQuery' | 'insert' | Expression<string>;
	/**
	 * The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.
	 */
	query: string | Expression<string>;
	/**
	 * Name of the schema the table belongs to
	 */
	schema?: unknown;
	/**
	 * Name of the table in which to insert data to
	 */
	table: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows
	 */
	columns?: string | Expression<string>;
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

export interface QuestDbV1Credentials {
	questDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type QuestDbV1Node = {
	type: 'n8n-nodes-base.questDb';
	version: 1;
	config: NodeConfig<QuestDbV1Params>;
	credentials?: QuestDbV1Credentials;
};

export type QuestDbNode = QuestDbV1Node;
