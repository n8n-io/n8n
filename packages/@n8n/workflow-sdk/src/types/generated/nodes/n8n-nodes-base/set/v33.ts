/**
 * Edit Fields (Set) Node - Version 3.3
 * Modify, add, or remove item fields
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// Helper types for special n8n fields
type AssignmentCollectionValue = { assignments: Array<{ id: string; name: string; value: unknown; type: string }> };

// ===========================================================================
// Parameters
// ===========================================================================

/** Edit item fields one by one */
export type SetV33ManualConfig = {
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
	assignments?: AssignmentCollectionValue;
/**
 * Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["selected"], /includeOtherFields: [true] }
 */
		includeFields?: string | Expression<string>;
/**
 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["except"], /includeOtherFields: [true] }
 */
		excludeFields?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Customize item output with JSON */
export type SetV33RawConfig = {
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
 * Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["selected"], /includeOtherFields: [true] }
 */
		includeFields?: string | Expression<string>;
/**
 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
 * @displayOptions.show { include: ["except"], /includeOtherFields: [true] }
 */
		excludeFields?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SetV33Params =
	| SetV33ManualConfig
	| SetV33RawConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface SetV33NodeBase {
	type: 'n8n-nodes-base.set';
	version: 3.3;
}

export type SetV33ManualNode = SetV33NodeBase & {
	config: NodeConfig<SetV33ManualConfig>;
};

export type SetV33RawNode = SetV33NodeBase & {
	config: NodeConfig<SetV33RawConfig>;
};

export type SetV33Node =
	| SetV33ManualNode
	| SetV33RawNode
	;