/**
 * Microsoft SQL Node - Version 1
 * Get, add and update data in Microsoft SQL
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MicrosoftSqlV1Config {
	operation?: 'executeQuery' | 'insert' | 'update' | 'delete' | Expression<string>;
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
/**
 * Name of the property which decides which rows in the database should be deleted. Normally that would be "id".
 * @displayOptions.show { operation: ["delete"] }
 * @default id
 */
		deleteKey: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftSqlV1Credentials {
	microsoftSql: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftSqlV1NodeBase {
	type: 'n8n-nodes-base.microsoftSql';
	version: 1;
	credentials?: MicrosoftSqlV1Credentials;
}

export type MicrosoftSqlV1Node = MicrosoftSqlV1NodeBase & {
	config: NodeConfig<MicrosoftSqlV1Config>;
};

export type MicrosoftSqlV1Node = MicrosoftSqlV1Node;