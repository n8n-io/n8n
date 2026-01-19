/**
 * Set Node - Version 2
 * Sets values on items and optionally remove other values
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SetV2Params {
/**
 * Whether only the values set on this node should be kept and all others removed
 * @default false
 */
		keepOnlySet?: boolean | Expression<boolean>;
/**
 * The value to set
 * @default {}
 */
		values?: {
		boolean?: Array<{
			/** Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"
			 * @default propertyName
			 */
			name?: string | Expression<string>;
			/** The boolean value to write in the property
			 * @default false
			 */
			value?: boolean | Expression<boolean>;
		}>;
		number?: Array<{
			/** Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"
			 * @default propertyName
			 */
			name?: string | Expression<string>;
			/** The number value to write in the property
			 * @default 0
			 */
			value?: number | Expression<number>;
		}>;
		string?: Array<{
			/** Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"
			 * @default propertyName
			 */
			name?: string | Expression<string>;
			/** The string value to write in the property
			 */
			value?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface SetV2NodeBase {
	type: 'n8n-nodes-base.set';
	version: 2;
}

export type SetV2ParamsNode = SetV2NodeBase & {
	config: NodeConfig<SetV2Params>;
};

export type SetV2Node = SetV2ParamsNode;