/**
 * Compare Datasets Node Types
 *
 * Compare two inputs for changes
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/comparedatasets/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CompareDatasetsV23Params {
	mergeByFields?: {
		values?: Array<{ field1?: string | Expression<string>; field2?: string | Expression<string> }>;
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

export type CompareDatasetsV23Node = {
	type: 'n8n-nodes-base.compareDatasets';
	version: 1 | 2 | 2.1 | 2.2 | 2.3;
	config: NodeConfig<CompareDatasetsV23Params>;
	credentials?: Record<string, never>;
};

export type CompareDatasetsNode = CompareDatasetsV23Node;
