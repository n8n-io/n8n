/**
 * Filter Node - Version 2.3
 * Remove items matching a condition
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV23Params {
	conditions?: FilterValue;
/**
 * If the type of an expression doesn't match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans &lt;code&gt;"false"&lt;/code&gt; or &lt;code&gt;0&lt;/code&gt; will be cast to &lt;code&gt;false&lt;/code&gt;
 * @displayOptions.show { @version: [{"_cnd":{"gte":2.1}}] }
 * @default false
 */
		looseTypeValidation?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type FilterV23Node = {
	type: 'n8n-nodes-base.filter';
	version: 2 | 2.1 | 2.2 | 2.3;
	config: NodeConfig<FilterV23Params>;
	credentials?: Record<string, never>;
};