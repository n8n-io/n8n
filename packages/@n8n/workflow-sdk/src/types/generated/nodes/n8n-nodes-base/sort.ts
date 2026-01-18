/**
 * Sort Node Types
 *
 * Change items order
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/sort/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SortV1Params {
	/**
	 * The type of sorting to perform
	 * @default simple
	 */
	type?: 'simple' | 'random' | 'code' | Expression<string>;
	/**
	 * The fields of the input items to sort by
	 * @default {}
	 */
	sortFieldsUi?: Record<string, unknown>;
	/**
 * Javascript code to determine the order of any two items
 * @default // The two items to compare are in the variables a and b
	// Access the fields in a.json and b.json
	// Return -1 if a should go before b
	// Return 1 if b should go before a
	// Return 0 if there's no difference

	fieldName = 'myField';

	if (a.json[fieldName] < b.json[fieldName]) {
	return -1;
	}
	if (a.json[fieldName] > b.json[fieldName]) {
	return 1;
	}
	return 0;
 */
	code?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SortNode = {
	type: 'n8n-nodes-base.sort';
	version: 1;
	config: NodeConfig<SortV1Params>;
	credentials?: Record<string, never>;
};
