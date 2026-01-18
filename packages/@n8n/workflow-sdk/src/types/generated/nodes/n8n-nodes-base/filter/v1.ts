/**
 * Filter Node - Version 1
 * Remove items matching a condition
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV1Params {
/**
 * The type of values to compare
 * @default {}
 */
		conditions?: {
		boolean?: Array<{
			/** The value to compare with the second one
			 * @default false
			 */
			value1?: boolean | Expression<boolean>;
			/** Operation to decide where the data should be mapped to
			 * @default equal
			 */
			operation?: 'equal' | 'notEqual' | Expression<string>;
			/** The value to compare with the first one
			 * @default false
			 */
			value2?: boolean | Expression<boolean>;
		}>;
		dateTime?: Array<{
			/** The value to compare with the second one
			 */
			value1?: string | Expression<string>;
			/** Operation to decide where the data should be mapped to
			 * @default after
			 */
			operation?: 'after' | 'before' | Expression<string>;
			/** The value to compare with the first one
			 */
			value2?: string | Expression<string>;
		}>;
		number?: Array<{
			/** The value to compare with the second one
			 * @default 0
			 */
			value1?: number | Expression<number>;
			/** Operation to decide where the data should be mapped to
			 * @default smaller
			 */
			operation?: 'smaller' | 'smallerEqual' | 'equal' | 'notEqual' | 'larger' | 'largerEqual' | 'isEmpty' | 'isNotEmpty' | Expression<string>;
			/** The value to compare with the first one
			 * @displayOptions.hide { operation: ["isEmpty", "isNotEmpty"] }
			 * @default 0
			 */
			value2?: number | Expression<number>;
		}>;
		string?: Array<{
			/** The value to compare with the second one
			 */
			value1?: string | Expression<string>;
			/** Operation to decide where the data should be mapped to
			 * @default equal
			 */
			operation?: 'contains' | 'notContains' | 'endsWith' | 'notEndsWith' | 'equal' | 'notEqual' | 'regex' | 'notRegex' | 'startsWith' | 'notStartsWith' | 'isEmpty' | 'isNotEmpty' | Expression<string>;
			/** The value to compare with the first one
			 * @displayOptions.hide { operation: ["isEmpty", "isNotEmpty", "regex", "notRegex"] }
			 */
			value2?: string | Expression<string>;
			/** The regex which has to match
			 * @displayOptions.show { operation: ["regex", "notRegex"] }
			 */
			value2?: string | Expression<string>;
		}>;
	};
/**
 * How to combine the conditions: AND requires all conditions to be true, OR requires at least one condition to be true
 * @default AND
 */
		combineConditions?: 'AND' | 'OR' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type FilterV1Node = {
	type: 'n8n-nodes-base.filter';
	version: 1;
	config: NodeConfig<FilterV1Params>;
	credentials?: Record<string, never>;
};