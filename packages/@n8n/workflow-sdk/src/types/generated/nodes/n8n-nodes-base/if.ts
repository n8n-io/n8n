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
	conditions?: Record<string, unknown>;
	/**
	 * If multiple rules got set this settings decides if it is true as soon as ANY condition matches or only if ALL get meet
	 * @default all
	 */
	combineOperation?: 'all' | 'any' | Expression<string>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type IfNode = {
	type: 'n8n-nodes-base.if';
	version: 1 | 2 | 2.1 | 2.2 | 2.3;
	config: NodeConfig<IfV23Params>;
	credentials?: Record<string, never>;
};
