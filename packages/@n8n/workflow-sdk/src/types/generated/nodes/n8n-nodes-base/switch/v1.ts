/**
 * Switch Node - Version 1
 * Route items depending on defined expression or rules
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

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

export type SwitchV1Params =
	| SwitchV1ExpressionConfig
	| SwitchV1RulesConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type SwitchV1Node = {
	type: 'n8n-nodes-base.switch';
	version: 1;
	config: NodeConfig<SwitchV1Params>;
	credentials?: Record<string, never>;
};