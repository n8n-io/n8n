/**
 * Compare Datasets Node - Version 2.3
 * Compare two inputs for changes
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CompareDatasetsV23Params {
	mergeByFields?: {
		values?: Array<{
			/** Input A Field
			 * @hint  Enter the field name as text
			 */
			field1?: string | Expression<string>;
			/** Input B Field
			 * @hint  Enter the field name as text
			 */
			field2?: string | Expression<string>;
		}>;
	};
	resolve?: 'preferInput1' | 'preferInput2' | 'mix' | 'includeBoth' | Expression<string>;
/**
 * Whether to tolerate small type differences when comparing fields. E.g. the number 3 and the string '3' are treated as the same.
 * @default false
 */
		fuzzyCompare?: boolean | Expression<boolean>;
	preferWhenMix?: 'input1' | 'input2' | Expression<string>;
	exceptWhenMix?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface CompareDatasetsV23NodeBase {
	type: 'n8n-nodes-base.compareDatasets';
	version: 2.3;
}

export type CompareDatasetsV23ParamsNode = CompareDatasetsV23NodeBase & {
	config: NodeConfig<CompareDatasetsV23Params>;
};

export type CompareDatasetsV23Node = CompareDatasetsV23ParamsNode;