/**
 * Switch Node - Version 3
 * Route items depending on defined expression or rules
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Build a matching rule for each output */
export type SwitchV3RulesConfig = {
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
	options?: Record<string, unknown>;
};

/** Write an expression to return the output index */
export type SwitchV3ExpressionConfig = {
	mode: 'expression';
/**
 * The output index to send the input item to. Use an expression to calculate which input item should be routed to which output. The expression must return a number.
 * @hint The index to route the item to, starts at 0
 * @displayOptions.show { mode: ["expression"] }
 * @default ={{}}
 */
		output?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface SwitchV3NodeBase {
	type: 'n8n-nodes-base.switch';
	version: 3;
}

export type SwitchV3RulesNode = SwitchV3NodeBase & {
	config: NodeConfig<SwitchV3RulesConfig>;
};

export type SwitchV3ExpressionNode = SwitchV3NodeBase & {
	config: NodeConfig<SwitchV3ExpressionConfig>;
};

export type SwitchV3Node =
	| SwitchV3RulesNode
	| SwitchV3ExpressionNode
	;