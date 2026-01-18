/**
 * Switch Node - Version 3.3
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
export type SwitchV33RulesConfig = {
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
export type SwitchV33ExpressionConfig = {
	mode: 'expression';
/**
 * The output index to send the input item to. Use an expression to calculate which input item should be routed to which output. The expression must return a number.
 * @hint The index to route the item to, starts at 0
 * @displayOptions.show { mode: ["expression"] }
 * @default ={{}}
 */
		output?: number | Expression<number>;
};

export type SwitchV33Params =
	| SwitchV33RulesConfig
	| SwitchV33ExpressionConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type SwitchV33Node = {
	type: 'n8n-nodes-base.switch';
	version: 3.3;
	config: NodeConfig<SwitchV33Params>;
	credentials?: Record<string, never>;
};