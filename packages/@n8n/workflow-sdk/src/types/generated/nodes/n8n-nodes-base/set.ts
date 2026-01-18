/**
 * Edit Fields (Set) Node Types
 *
 * Modify, add, or remove item fields
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/set/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type AssignmentCollectionValue = {
	assignments: Array<{ id: string; name: string; value: unknown; type: string }>;
};

// ===========================================================================
// Parameters
// ===========================================================================

/** Edit item fields one by one */
export type SetV34ManualConfig = {
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
	 * @displayOptions.show { @version: [3, 3.1, 3.2], mode: ["manual"] }
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
			type?:
				| 'stringValue'
				| 'numberValue'
				| 'booleanValue'
				| 'arrayValue'
				| 'objectValue'
				| Expression<string>;
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
	assignments?: AssignmentCollectionValue;
	/**
	 * How to select the fields you want to include in your output items
	 * @displayOptions.show { @version: [3, 3.1, 3.2] }
	 * @default all
	 */
	include?: 'all' | 'none' | 'selected' | 'except' | Expression<string>;
	/**
	 * Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.
	 * @displayOptions.show { include: ["selected"], @version: [3, 3.1, 3.2] }
	 */
	includeFields?: string | Expression<string>;
	/**
	 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
	 * @displayOptions.show { include: ["except"], @version: [3, 3.1, 3.2] }
	 */
	excludeFields?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Customize item output with JSON */
export type SetV34RawConfig = {
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
	 * @displayOptions.show { @version: [3, 3.1, 3.2] }
	 * @default all
	 */
	include?: 'all' | 'none' | 'selected' | 'except' | Expression<string>;
	/**
	 * Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.
	 * @displayOptions.show { include: ["selected"], @version: [3, 3.1, 3.2] }
	 */
	includeFields?: string | Expression<string>;
	/**
	 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
	 * @displayOptions.show { include: ["except"], @version: [3, 3.1, 3.2] }
	 */
	excludeFields?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SetV34Params = SetV34ManualConfig | SetV34RawConfig;

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

export type SetV34Node = {
	type: 'n8n-nodes-base.set';
	version: 3 | 3.1 | 3.2 | 3.3 | 3.4;
	config: NodeConfig<SetV34Params>;
	credentials?: Record<string, never>;
};

export type SetV2Node = {
	type: 'n8n-nodes-base.set';
	version: 1 | 2;
	config: NodeConfig<SetV2Params>;
	credentials?: Record<string, never>;
};

export type SetNode = SetV34Node | SetV2Node;
