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
	 * @default 0
	 */
	duplicateCount?: number | Expression<number>;
	/**
	 * Edit existing fields or add new ones to modify the output data
	 * @default {}
	 */
	fields?: Record<string, unknown>;
	assignments?: AssignmentCollectionValue;
	/**
	 * How to select the fields you want to include in your output items
	 * @default all
	 */
	include?: 'all' | 'none' | 'selected' | 'except' | Expression<string>;
	/**
	 * Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.
	 */
	includeFields?: string | Expression<string>;
	/**
	 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
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
	 */
	includeFields?: string | Expression<string>;
	/**
	 * Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.
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
	values?: Record<string, unknown>;
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
