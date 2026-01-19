/**
 * Merge Node - Version 2
 * Merges data of multiple streams once data from both is available
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** All items of input 1, then all items of input 2 */
export type MergeV2AppendConfig = {
	mode: 'append';
};

/** Merge matching items together */
export type MergeV2CombineConfig = {
	mode: 'combine';
	combinationMode?: 'mergeByFields' | 'mergeByPosition' | 'multiplex' | Expression<string>;
	mergeByFields?: {
		values?: Array<{
			/** Input 1 Field
			 * @hint  Enter the field name as text
			 */
			field1?: string | Expression<string>;
			/** Input 2 Field
			 * @hint  Enter the field name as text
			 */
			field2?: string | Expression<string>;
		}>;
	};
	joinMode?: 'keepMatches' | 'keepNonMatches' | 'keepEverything' | 'enrichInput1' | 'enrichInput2' | Expression<string>;
	outputDataFrom?: 'both' | 'input1' | 'input2' | Expression<string>;
};

/** Output input data, without modifying it */
export type MergeV2ChooseBranchConfig = {
	mode: 'chooseBranch';
	chooseBranchMode?: 'waitForBoth' | Expression<string>;
	output?: 'input1' | 'input2' | 'empty' | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface MergeV2NodeBase {
	type: 'n8n-nodes-base.merge';
	version: 2;
}

export type MergeV2AppendNode = MergeV2NodeBase & {
	config: NodeConfig<MergeV2AppendConfig>;
};

export type MergeV2CombineNode = MergeV2NodeBase & {
	config: NodeConfig<MergeV2CombineConfig>;
};

export type MergeV2ChooseBranchNode = MergeV2NodeBase & {
	config: NodeConfig<MergeV2ChooseBranchConfig>;
};

export type MergeV2Node =
	| MergeV2AppendNode
	| MergeV2CombineNode
	| MergeV2ChooseBranchNode
	;