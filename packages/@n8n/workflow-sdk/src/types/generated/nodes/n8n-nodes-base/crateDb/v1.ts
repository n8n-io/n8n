/**
 * CrateDB Node - Version 1
 * Add and update data in CrateDB
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CrateDbV1Params {
	operation?: 'executeQuery' | 'insert' | 'update' | Expression<string>;
/**
 * The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.
 * @displayOptions.show { operation: ["executeQuery"] }
 */
		query: string | Expression<string>;
/**
 * Name of the schema the table belongs to
 * @displayOptions.show { operation: ["insert"] }
 * @default doc
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

export interface CrateDbV1Credentials {
	crateDb: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CrateDbV1Node = {
	type: 'n8n-nodes-base.crateDb';
	version: 1;
	config: NodeConfig<CrateDbV1Params>;
	credentials?: CrateDbV1Credentials;
};