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
