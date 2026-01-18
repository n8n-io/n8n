/**
 * Compare Datasets Node - Version 1
 * Compare two inputs for changes
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CompareDatasetsV1Params {
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
	preferWhenMix?: 'input1' | 'input2' | Expression<string>;
	exceptWhenMix?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type CompareDatasetsV1Node = {
	type: 'n8n-nodes-base.compareDatasets';
	version: 1;
	config: NodeConfig<CompareDatasetsV1Params>;
	credentials?: Record<string, never>;
};