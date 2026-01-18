/**
 * Filter Node Types
 *
 * Remove items matching a condition
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/filter/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type FilterValue = {
	conditions: Array<{
		leftValue: unknown;
		operator: { type: string; operation: string };
		rightValue: unknown;
	}>;
};

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV23Params {
	conditions?: FilterValue;
	/**
	 * If the type of an expression doesn't match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans &lt;code&gt;"false"&lt;/code&gt; or &lt;code&gt;0&lt;/code&gt; will be cast to &lt;code&gt;false&lt;/code&gt;
	 * @default false
	 */
	looseTypeValidation?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
}

export interface FilterV1Params {
	/**
	 * The type of values to compare
	 * @default {}
	 */
	conditions?: {
		boolean?: Array<{
			value1?: boolean | Expression<boolean>;
			operation?: 'equal' | 'notEqual' | Expression<string>;
			value2?: boolean | Expression<boolean>;
		}>;
		dateTime?: Array<{
			value1?: string | Expression<string>;
			operation?: 'after' | 'before' | Expression<string>;
			value2?: string | Expression<string>;
		}>;
		number?: Array<{
			value1?: number | Expression<number>;
			operation?:
				| 'smaller'
				| 'smallerEqual'
				| 'equal'
				| 'notEqual'
				| 'larger'
				| 'largerEqual'
				| 'isEmpty'
				| 'isNotEmpty'
				| Expression<string>;
			value2?: number | Expression<number>;
		}>;
		string?: Array<{
			value1?: string | Expression<string>;
			operation?:
				| 'contains'
				| 'notContains'
				| 'endsWith'
				| 'notEndsWith'
				| 'equal'
				| 'notEqual'
				| 'regex'
				| 'notRegex'
				| 'startsWith'
				| 'notStartsWith'
				| 'isEmpty'
				| 'isNotEmpty'
				| Expression<string>;
			value2?: string | Expression<string>;
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
// Node Types
// ===========================================================================

export type FilterV23Node = {
	type: 'n8n-nodes-base.filter';
	version: 2 | 2.1 | 2.2 | 2.3;
	config: NodeConfig<FilterV23Params>;
	credentials?: Record<string, never>;
};

export type FilterV1Node = {
	type: 'n8n-nodes-base.filter';
	version: 1;
	config: NodeConfig<FilterV1Params>;
	credentials?: Record<string, never>;
};

export type FilterNode = FilterV23Node | FilterV1Node;
