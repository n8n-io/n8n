/**
 * Switch Node - Version 2
 * Route items depending on defined expression or rules
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

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

export type SwitchV2Params =
	| SwitchV2ExpressionConfig
	| SwitchV2RulesConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface SwitchV2NodeBase {
	type: 'n8n-nodes-base.switch';
	version: 2;
}

export type SwitchV2ExpressionNode = SwitchV2NodeBase & {
	config: NodeConfig<SwitchV2ExpressionConfig>;
};

export type SwitchV2RulesNode = SwitchV2NodeBase & {
	config: NodeConfig<SwitchV2RulesConfig>;
};

export type SwitchV2Node =
	| SwitchV2ExpressionNode
	| SwitchV2RulesNode
	;