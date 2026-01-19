/**
 * Set Node - Version 1
 * Sets values on items and optionally remove other values
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SetV1Params {
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

interface SetV1NodeBase {
	type: 'n8n-nodes-base.set';
	version: 1;
}

export type SetV1ParamsNode = SetV1NodeBase & {
	config: NodeConfig<SetV1Params>;
};

export type SetV1Node = SetV1ParamsNode;