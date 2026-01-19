/**
 * Edit Fields (Set) Node - Version 3
 * Modify, add, or remove item fields
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Edit item fields one by one */
export type SetV3ManualConfig = {
	mode: 'manual';
/**
 * Whether this item should be duplicated a set number of times
 * @default false
 */
		duplicateItem?: boolean | Expression<boolean>;
/**
 * How many times the item should be duplicated, mainly used for testing and debugging
 * @displayOptions.show { duplicateItem: [true] }
 * @default 0
 */
		duplicateCount?: number | Expression<number>;
/**
 * Edit existing fields or add new ones to modify the output data
 * @displayOptions.show { mode: ["manual"] }
 * @default {}
 */
		fields?: {
		values?: Array<{
			/** Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name.
			 */
			name?: string | Expression<string>;
			/** The field value type
			 * @default stringValue
			 */
			type?: 'stringValue' | 'numberValue' | 'booleanValue' | 'arrayValue' | 'objectValue' | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["stringValue"] }
			 */
			stringValue?: string | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["numberValue"] }
			 */
			numberValue?: string | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["booleanValue"] }
			 * @default true
			 */
			booleanValue?: 'true' | 'false' | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["arrayValue"] }
			 */
			arrayValue?: string | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["objectValue"] }
			 * @default ={}
			 */
			objectValue?: IDataObject | string | Expression<string>;
		}>;
	};
/**
 * How to select the fields you want to include in your output items
 * @default all
 */
		include?: 'all' | 'none' | 'selected' | 'except' | Expression<string>;
/**
 * Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["selected"] }
 */
		includeFields?: string | Expression<string>;
/**
 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["except"] }
 */
		excludeFields?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Customize item output with JSON */
export type SetV3RawConfig = {
	mode: 'raw';
/**
 * Whether this item should be duplicated a set number of times
 * @default false
 */
		duplicateItem?: boolean | Expression<boolean>;
/**
 * How many times the item should be duplicated, mainly used for testing and debugging
 * @displayOptions.show { duplicateItem: [true] }
 * @default 0
 */
		duplicateCount?: number | Expression<number>;
	jsonOutput?: IDataObject | string | Expression<string>;
/**
 * How to select the fields you want to include in your output items
 * @default all
 */
		include?: 'all' | 'none' | 'selected' | 'except' | Expression<string>;
/**
 * Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["selected"] }
 */
		includeFields?: string | Expression<string>;
/**
 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["except"] }
 */
		excludeFields?: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface SetV3NodeBase {
	type: 'n8n-nodes-base.set';
	version: 3;
}

export type SetV3ManualNode = SetV3NodeBase & {
	config: NodeConfig<SetV3ManualConfig>;
};

export type SetV3RawNode = SetV3NodeBase & {
	config: NodeConfig<SetV3RawConfig>;
};

export type SetV3Node =
	| SetV3ManualNode
	| SetV3RawNode
	;