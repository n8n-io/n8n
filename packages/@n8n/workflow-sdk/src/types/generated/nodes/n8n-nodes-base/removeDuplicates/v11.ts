/**
 * Remove Duplicates Node - Version 1.1
 * Delete items with matching field values
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RemoveDuplicatesV11Params {
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
// Node Type
// ===========================================================================

export type RemoveDuplicatesV11Node = {
	type: 'n8n-nodes-base.removeDuplicates';
	version: 1 | 1.1;
	config: NodeConfig<RemoveDuplicatesV11Params>;
	credentials?: Record<string, never>;
};