/**
 * Switch Node - Version 3.2
 * Route items depending on defined expression or rules
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Build a matching rule for each output */
export type SwitchV32RulesConfig = {
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
export type SwitchV32ExpressionConfig = {
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

interface SwitchV32NodeBase {
	type: 'n8n-nodes-base.switch';
	version: 3.2;
}

export type SwitchV32RulesNode = SwitchV32NodeBase & {
	config: NodeConfig<SwitchV32RulesConfig>;
};

export type SwitchV32ExpressionNode = SwitchV32NodeBase & {
	config: NodeConfig<SwitchV32ExpressionConfig>;
};

export type SwitchV32Node =
	| SwitchV32RulesNode
	| SwitchV32ExpressionNode
	;