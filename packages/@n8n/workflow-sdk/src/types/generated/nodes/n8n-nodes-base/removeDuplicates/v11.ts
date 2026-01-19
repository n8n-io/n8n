/**
 * Remove Duplicates Node - Version 1.1
 * Delete items with matching field values
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RemoveDuplicatesV11Config {
/**
 * The fields of the input items to compare to see if they are the same
 * @default allFields
 */
		compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields' | Expression<string>;
/**
 * Fields in the input to exclude from the comparison
 * @displayOptions.show { compare: ["allFieldsExcept"] }
 */
		fieldsToExclude?: string | Expression<string>;
/**
 * Fields in the input to add to the comparison
 * @displayOptions.show { compare: ["selectedFields"] }
 */
		fieldsToCompare?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface RemoveDuplicatesV11NodeBase {
	type: 'n8n-nodes-base.removeDuplicates';
	version: 1.1;
}

export type RemoveDuplicatesV11Node = RemoveDuplicatesV11NodeBase & {
	config: NodeConfig<RemoveDuplicatesV11Config>;
};

export type RemoveDuplicatesV11Node = RemoveDuplicatesV11Node;