/**
 * Merge Node - Version 2.1
 * Merges data of multiple streams once data from both is available
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** All items of input 1, then all items of input 2 */
export type MergeV21AppendConfig = {
	mode: 'append';
};

/** Merge matching items together */
export type MergeV21CombineConfig = {
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
export type MergeV21ChooseBranchConfig = {
	mode: 'chooseBranch';
	chooseBranchMode?: 'waitForBoth' | Expression<string>;
	output?: 'input1' | 'input2' | 'empty' | Expression<string>;
};

export type MergeV21Params =
	| MergeV21AppendConfig
	| MergeV21CombineConfig
	| MergeV21ChooseBranchConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface MergeV21NodeBase {
	type: 'n8n-nodes-base.merge';
	version: 2.1;
}

export type MergeV21AppendNode = MergeV21NodeBase & {
	config: NodeConfig<MergeV21AppendConfig>;
};

export type MergeV21CombineNode = MergeV21NodeBase & {
	config: NodeConfig<MergeV21CombineConfig>;
};

export type MergeV21ChooseBranchNode = MergeV21NodeBase & {
	config: NodeConfig<MergeV21ChooseBranchConfig>;
};

export type MergeV21Node =
	| MergeV21AppendNode
	| MergeV21CombineNode
	| MergeV21ChooseBranchNode
	;