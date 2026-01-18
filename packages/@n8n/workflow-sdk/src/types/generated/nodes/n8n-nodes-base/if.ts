/**
 * If Node Types
 *
 * Route items to different branches (true/false)
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/if/
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

export interface IfV23Params {
	conditions?: FilterValue;
	/**
	 * If the type of an expression doesn't match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans &lt;code&gt;"false"&lt;/code&gt; or &lt;code&gt;0&lt;/code&gt; will be cast to &lt;code&gt;false&lt;/code&gt;
	 * @displayOptions.show { @version: [{"_cnd":{"gte":2.1}}] }
	 * @default false
	 */
	looseTypeValidation?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
}

export interface IfV1Params {
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
	 * If multiple rules got set this settings decides if it is true as soon as ANY condition matches or only if ALL get meet
	 * @default all
	 */
	combineOperation?: 'all' | 'any' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type IfV23Node = {
	type: 'n8n-nodes-base.if';
	version: 2 | 2.1 | 2.2 | 2.3;
	config: NodeConfig<IfV23Params>;
	credentials?: Record<string, never>;
};

export type IfV1Node = {
	type: 'n8n-nodes-base.if';
	version: 1;
	config: NodeConfig<IfV1Params>;
	credentials?: Record<string, never>;
};

export type IfNode = IfV23Node | IfV1Node;
