/**
 * Merge Node - Version 3
 * Merges data of multiple streams once data from both is available
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Output items of each input, one after the other */
export type MergeV3AppendConfig = {
	mode: 'append';
/**
 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
 * @displayOptions.show { mode: ["append"] }
 * @default 2
 */
		numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
};

/** Merge matching items together */
export type MergeV3CombineConfig = {
	mode: 'combine';
/**
 * How input data should be merged
 * @displayOptions.show { mode: ["combine"] }
 * @default combineByFields
 */
		combineBy?: 'combineByFields' | 'combineByPosition' | 'combineAll' | Expression<string>;
	options?: Record<string, unknown>;
/**
 * Whether name(s) of field to match are different in input 1 and input 2
 * @displayOptions.show { mode: ["combine"], combineBy: ["combineByFields"] }
 * @default false
 */
		advanced?: boolean | Expression<boolean>;
/**
 * Specify the fields to use for matching input items
 * @hint Drag or type the input field name
 * @displayOptions.show { advanced: [false], mode: ["combine"], combineBy: ["combineByFields"] }
 */
		fieldsToMatchString?: string | Expression<string>;
/**
 * Specify the fields to use for matching input items
 * @displayOptions.show { advanced: [true], mode: ["combine"], combineBy: ["combineByFields"] }
 * @default {"values":[{"field1":"","field2":""}]}
 */
		mergeByFields?: {
		values?: Array<{
			/** Input 1 Field
			 * @hint Drag or type the input field name
			 */
			field1?: string | Expression<string>;
			/** Input 2 Field
			 * @hint Drag or type the input field name
			 */
			field2?: string | Expression<string>;
		}>;
	};
/**
 * How to select the items to send to output
 * @displayOptions.show { mode: ["combine"], combineBy: ["combineByFields"] }
 * @default keepMatches
 */
		joinMode?: 'keepMatches' | 'keepNonMatches' | 'keepEverything' | 'enrichInput1' | 'enrichInput2' | Expression<string>;
	outputDataFrom?: 'both' | 'input1' | 'input2' | Expression<string>;
/**
 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
 * @displayOptions.show { mode: ["combine"], combineBy: ["combineByPosition"] }
 * @default 2
 */
		numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
};

/** Write a query to do the merge */
export type MergeV3CombineBySqlConfig = {
	mode: 'combineBySql';
/**
 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
 * @displayOptions.show { mode: ["combineBySql"] }
 * @default 2
 */
		numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
/**
 * Input data available as tables with corresponding number, e.g. input1, input2
 * @hint Supports &lt;a href="https://github.com/alasql/alasql/wiki/Supported-SQL-statements" target="_blank"&gt;most&lt;/a&gt; of the SQL-99 language
 * @displayOptions.show { mode: ["combineBySql"] }
 * @default SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.id
 */
		query: string | Expression<string>;
};

/** Output data from a specific branch, without modifying it */
export type MergeV3ChooseBranchConfig = {
	mode: 'chooseBranch';
/**
 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
 * @displayOptions.show { mode: ["chooseBranch"] }
 * @default 2
 */
		numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
	chooseBranchMode?: 'waitForAll' | Expression<string>;
	output?: 'specifiedInput' | 'empty' | Expression<string>;
/**
 * The number of the input to use data of
 * @displayOptions.show { output: ["specifiedInput"], mode: ["chooseBranch"] }
 * @default 1
 */
		useDataOfInput?: string | Expression<string>;
};

export type MergeV3Params =
	| MergeV3AppendConfig
	| MergeV3CombineConfig
	| MergeV3CombineBySqlConfig
	| MergeV3ChooseBranchConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface MergeV3NodeBase {
	type: 'n8n-nodes-base.merge';
	version: 3;
}

export type MergeV3AppendNode = MergeV3NodeBase & {
	config: NodeConfig<MergeV3AppendConfig>;
};

export type MergeV3CombineNode = MergeV3NodeBase & {
	config: NodeConfig<MergeV3CombineConfig>;
};

export type MergeV3CombineBySqlNode = MergeV3NodeBase & {
	config: NodeConfig<MergeV3CombineBySqlConfig>;
};

export type MergeV3ChooseBranchNode = MergeV3NodeBase & {
	config: NodeConfig<MergeV3ChooseBranchConfig>;
};

export type MergeV3Node =
	| MergeV3AppendNode
	| MergeV3CombineNode
	| MergeV3CombineBySqlNode
	| MergeV3ChooseBranchNode
	;