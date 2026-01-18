/**
 * Switch Node Types
 *
 * Route items depending on defined expression or rules
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/switch/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Build a matching rule for each output */
export type SwitchV34RulesConfig = {
	mode: 'rules';
	rules?: Record<string, unknown>;
	/**
	 * If the type of an expression doesn't match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans &lt;code&gt;"false"&lt;/code&gt; or &lt;code&gt;0&lt;/code&gt; will be cast to &lt;code&gt;false&lt;/code&gt;
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
	 * @default 4
	 */
	numberOutputs?: number | Expression<number>;
	/**
	 * The output index to send the input item to. Use an expression to calculate which input item should be routed to which output. The expression must return a number.
	 * @default ={{}}
	 */
	output?: number | Expression<number>;
	/**
	 * If the type of an expression doesn't match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans &lt;code&gt;"false"&lt;/code&gt; or &lt;code&gt;0&lt;/code&gt; will be cast to &lt;code&gt;false&lt;/code&gt;
	 * @default false
	 */
	looseTypeValidation?: boolean | Expression<boolean>;
};

export type SwitchV34Params = SwitchV34RulesConfig | SwitchV34ExpressionConfig;

/** Expression decides how to route data */
export type SwitchV2ExpressionConfig = {
	mode: 'expression';
	/**
	 * The index of output to which to send data to
	 */
	output?: string | Expression<string>;
	/**
	 * Amount of outputs to create
	 * @default 4
	 */
	outputsAmount?: number | Expression<number>;
};

/** Rules decide how to route data */
export type SwitchV2RulesConfig = {
	mode: 'rules';
	/**
	 * The type of data to route on
	 * @default number
	 */
	dataType?: 'boolean' | 'dateTime' | 'number' | 'string' | Expression<string>;
	/**
	 * The value to compare with the first one
	 * @default false
	 */
	value1?: boolean | Expression<boolean>;
	rules?: Record<string, unknown>;
	/**
	 * The output to which to route all items which do not match any of the rules. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default -1
	 */
	fallbackOutput?: string | Expression<string>;
};

export type SwitchV2Params = SwitchV2ExpressionConfig | SwitchV2RulesConfig;

/** Expression decides how to route data */
export type SwitchV1ExpressionConfig = {
	mode: 'expression';
	/**
	 * The index of output to which to send data to
	 * @default 0
	 */
	output?: number | Expression<number>;
};

/** Rules decide how to route data */
export type SwitchV1RulesConfig = {
	mode: 'rules';
	/**
	 * The type of data to route on
	 * @default number
	 */
	dataType?: 'boolean' | 'dateTime' | 'number' | 'string' | Expression<string>;
	/**
	 * The value to compare with the first one
	 * @default false
	 */
	value1?: boolean | Expression<boolean>;
	rules?: Record<string, unknown>;
	/**
	 * The output to which to route all items which do not match any of the rules
	 * @default -1
	 */
	fallbackOutput?: -1 | 0 | 1 | 2 | 3 | Expression<number>;
};

export type SwitchV1Params = SwitchV1ExpressionConfig | SwitchV1RulesConfig;

// ===========================================================================
// Node Type
// ===========================================================================

export type SwitchNode = {
	type: 'n8n-nodes-base.switch';
	version: 1 | 2 | 3 | 3.1 | 3.2 | 3.3 | 3.4;
	config: NodeConfig<SwitchV34Params>;
	credentials?: Record<string, never>;
};
