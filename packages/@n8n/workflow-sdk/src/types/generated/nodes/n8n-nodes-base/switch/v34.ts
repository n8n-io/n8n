/**
 * Switch Node - Version 3.4
 * Route items depending on defined expression or rules
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Build a matching rule for each output */
export type SwitchV34RulesConfig = {
	mode: 'rules';
	rules?: {
		values?: Array<{
			/** Conditions
			 * @default {}
			 */
			conditions?: FilterValue;
			/** Rename Output
			 * @default false
			 */
			renameOutput?: boolean | Expression<boolean>;
			/** The label of output to which to send data to if rule matches
			 * @displayOptions.show { renameOutput: [true] }
			 */
			outputKey?: string | Expression<string>;
		}>;
	};
/**
 * If the type of an expression doesn't match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans &lt;code&gt;"false"&lt;/code&gt; or &lt;code&gt;0&lt;/code&gt; will be cast to &lt;code&gt;false&lt;/code&gt;
 * @displayOptions.show { @version: [{"_cnd":{"gte":3.1}}] }
 * @default false
 */
		looseTypeValidation?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Write an expression to return the output index */
export type SwitchV34ExpressionConfig = {
	mode: 'expression';
/**
 * How many outputs to create
 * @displayOptions.show { mode: ["expression"], @version: [{"_cnd":{"gte":3.3}}] }
 * @default 4
 */
		numberOutputs?: number | Expression<number>;
/**
 * The output index to send the input item to. Use an expression to calculate which input item should be routed to which output. The expression must return a number.
 * @hint The index to route the item to, starts at 0
 * @displayOptions.show { mode: ["expression"] }
 * @default ={{}}
 */
		output?: number | Expression<number>;
/**
 * If the type of an expression doesn't match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans &lt;code&gt;"false"&lt;/code&gt; or &lt;code&gt;0&lt;/code&gt; will be cast to &lt;code&gt;false&lt;/code&gt;
 * @displayOptions.show { @version: [{"_cnd":{"gte":3.1}}] }
 * @default false
 */
		looseTypeValidation?: boolean | Expression<boolean>;
};

export type SwitchV34Params =
	| SwitchV34RulesConfig
	| SwitchV34ExpressionConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type SwitchV34Node = {
	type: 'n8n-nodes-base.switch';
	version: 3 | 3.1 | 3.2 | 3.3 | 3.4;
	config: NodeConfig<SwitchV34Params>;
	credentials?: Record<string, never>;
};