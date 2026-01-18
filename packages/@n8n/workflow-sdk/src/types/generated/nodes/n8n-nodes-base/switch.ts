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

export type SwitchV34Params = SwitchV34RulesConfig | SwitchV34ExpressionConfig;

/** Expression decides how to route data */
export type SwitchV2ExpressionConfig = {
	mode: 'expression';
	/**
	 * The index of output to which to send data to
	 * @displayOptions.show { mode: ["expression"] }
	 */
	output?: string | Expression<string>;
	/**
	 * Amount of outputs to create
	 * @displayOptions.show { mode: ["expression"] }
	 * @default 4
	 */
	outputsAmount?: number | Expression<number>;
};

/** Rules decide how to route data */
export type SwitchV2RulesConfig = {
	mode: 'rules';
	/**
	 * The type of data to route on
	 * @displayOptions.show { mode: ["rules"] }
	 * @default number
	 */
	dataType?: 'boolean' | 'dateTime' | 'number' | 'string' | Expression<string>;
	/**
	 * The value to compare with the first one
	 * @displayOptions.show { dataType: ["boolean"], mode: ["rules"] }
	 * @default false
	 */
	value1?: boolean | Expression<boolean>;
	rules?: {
		rules?: Array<{
			/** Operation to decide where the data should be mapped to
			 * @default equal
			 */
			operation?: 'equal' | 'notEqual' | Expression<string>;
			/** The value to compare with the first one
			 * @default false
			 */
			value2?: boolean | Expression<boolean>;
			/** The label of output to which to send data to if rule matches
			 */
			outputKey?: string | Expression<string>;
		}>;
	};
	/**
	 * The output to which to route all items which do not match any of the rules. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { mode: ["rules"] }
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
	 * @displayOptions.show { mode: ["expression"] }
	 * @default 0
	 */
	output?: number | Expression<number>;
};

/** Rules decide how to route data */
export type SwitchV1RulesConfig = {
	mode: 'rules';
	/**
	 * The type of data to route on
	 * @displayOptions.show { mode: ["rules"] }
	 * @default number
	 */
	dataType?: 'boolean' | 'dateTime' | 'number' | 'string' | Expression<string>;
	/**
	 * The value to compare with the first one
	 * @displayOptions.show { dataType: ["boolean"], mode: ["rules"] }
	 * @default false
	 */
	value1?: boolean | Expression<boolean>;
	rules?: {
		rules?: Array<{
			/** Operation to decide where the data should be mapped to
			 * @default equal
			 */
			operation?: 'equal' | 'notEqual' | Expression<string>;
			/** The value to compare with the first one
			 * @default false
			 */
			value2?: boolean | Expression<boolean>;
			/** The index of output to which to send data to if rule matches
			 * @default 0
			 */
			output?: number | Expression<number>;
		}>;
	};
	/**
	 * The output to which to route all items which do not match any of the rules
	 * @displayOptions.show { mode: ["rules"] }
	 * @default -1
	 */
	fallbackOutput?: -1 | 0 | 1 | 2 | 3 | Expression<number>;
};

export type SwitchV1Params = SwitchV1ExpressionConfig | SwitchV1RulesConfig;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type SwitchV34Node = {
	type: 'n8n-nodes-base.switch';
	version: 3 | 3.1 | 3.2 | 3.3 | 3.4;
	config: NodeConfig<SwitchV34Params>;
	credentials?: Record<string, never>;
};

export type SwitchV2Node = {
	type: 'n8n-nodes-base.switch';
	version: 2;
	config: NodeConfig<SwitchV2Params>;
	credentials?: Record<string, never>;
};

export type SwitchV1Node = {
	type: 'n8n-nodes-base.switch';
	version: 1;
	config: NodeConfig<SwitchV1Params>;
	credentials?: Record<string, never>;
};

export type SwitchNode = SwitchV34Node | SwitchV2Node | SwitchV1Node;
