/**
 * Remove Duplicates Node Types
 *
 * Delete items with matching field values
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/removeduplicates/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RemoveDuplicatesV2Params {
	operation?:
		| 'removeDuplicateInputItems'
		| 'removeItemsSeenInPreviousExecutions'
		| 'clearDeduplicationHistory'
		| Expression<string>;
	/**
	 * The fields of the input items to compare to see if they are the same
	 * @default allFields
	 */
	compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields' | Expression<string>;
	/**
	 * Fields in the input to exclude from the comparison
	 */
	fieldsToExclude?: string | Expression<string>;
	/**
	 * Fields in the input to add to the comparison
	 */
	fieldsToCompare?: string | Expression<string>;
	/**
	 * How to select input items to remove by comparing them with key values previously processed
	 * @default removeItemsWithAlreadySeenKeyValues
	 */
	logic?:
		| 'removeItemsWithAlreadySeenKeyValues'
		| 'removeItemsUpToStoredIncrementalKey'
		| 'removeItemsUpToStoredDate'
		| Expression<string>;
	/**
	 * Use an input field (or a combination of fields) that has a unique ID value
	 */
	dedupeValue: string | Expression<string>;
	/**
	 * Use an input field (or a combination of fields) that has an incremental value
	 */
	incrementalDedupeValue?: number | Expression<number>;
	/**
	 * Use an input field that has a date value in ISO format
	 */
	dateDedupeValue?: string | Expression<string>;
	/**
	 * How you want to modify the key values stored on the database. None of these modes removes input items.
	 * @default cleanDatabase
	 */
	mode?: 'cleanDatabase' | Expression<string>;
	options?: Record<string, unknown>;
}

export interface RemoveDuplicatesV11Params {
	/**
	 * The fields of the input items to compare to see if they are the same
	 * @default allFields
	 */
	compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields' | Expression<string>;
	/**
	 * Fields in the input to exclude from the comparison
	 */
	fieldsToExclude?: string | Expression<string>;
	/**
	 * Fields in the input to add to the comparison
	 */
	fieldsToCompare?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RemoveDuplicatesNode = {
	type: 'n8n-nodes-base.removeDuplicates';
	version: 1 | 1.1 | 2;
	config: NodeConfig<RemoveDuplicatesV2Params>;
	credentials?: Record<string, never>;
};
