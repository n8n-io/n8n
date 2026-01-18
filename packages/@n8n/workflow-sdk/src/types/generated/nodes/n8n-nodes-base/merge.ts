/**
 * Merge Node Types
 *
 * Merges data of multiple streams once data from both is available
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/merge/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Output items of each input, one after the other */
export type MergeV32AppendConfig = {
	mode: 'append';
	/**
	 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
	 * @default 2
	 */
	numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
};

/** Merge matching items together */
export type MergeV32CombineConfig = {
	mode: 'combine';
	/**
	 * How input data should be merged
	 * @default combineByFields
	 */
	combineBy?: 'combineByFields' | 'combineByPosition' | 'combineAll' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * Whether name(s) of field to match are different in input 1 and input 2
	 * @default false
	 */
	advanced?: boolean | Expression<boolean>;
	/**
	 * Specify the fields to use for matching input items
	 * @hint Drag or type the input field name
	 */
	fieldsToMatchString?: string | Expression<string>;
	/**
	 * Specify the fields to use for matching input items
	 * @default {"values":[{"field1":"","field2":""}]}
	 */
	mergeByFields?: {
		values?: Array<{ field1?: string | Expression<string>; field2?: string | Expression<string> }>;
	};
	/**
	 * How to select the items to send to output
	 * @default keepMatches
	 */
	joinMode?:
		| 'keepMatches'
		| 'keepNonMatches'
		| 'keepEverything'
		| 'enrichInput1'
		| 'enrichInput2'
		| Expression<string>;
	outputDataFrom?: 'both' | 'input1' | 'input2' | Expression<string>;
	/**
	 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
	 * @default 2
	 */
	numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
};

/** Write a query to do the merge */
export type MergeV32CombineBySqlConfig = {
	mode: 'combineBySql';
	/**
	 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
	 * @default 2
	 */
	numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
	/**
	 * Input data available as tables with corresponding number, e.g. input1, input2
	 * @hint Supports &lt;a href="https://github.com/alasql/alasql/wiki/Supported-SQL-statements" target="_blank"&gt;most&lt;/a&gt; of the SQL-99 language
	 * @default SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.id
	 */
	query: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Output data from a specific branch, without modifying it */
export type MergeV32ChooseBranchConfig = {
	mode: 'chooseBranch';
	/**
	 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
	 * @default 2
	 */
	numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
	chooseBranchMode?: 'waitForAll' | Expression<string>;
	output?: 'specifiedInput' | 'empty' | Expression<string>;
	/**
	 * The number of the input to use data of
	 * @default 1
	 */
	useDataOfInput?: string | Expression<string>;
};

export type MergeV32Params =
	| MergeV32AppendConfig
	| MergeV32CombineConfig
	| MergeV32CombineBySqlConfig
	| MergeV32ChooseBranchConfig;

/** All items of input 1, then all items of input 2 */
export type MergeV21AppendConfig = {
	mode: 'append';
};

/** Merge matching items together */
export type MergeV21CombineConfig = {
	mode: 'combine';
	combinationMode?: 'mergeByFields' | 'mergeByPosition' | 'multiplex' | Expression<string>;
	mergeByFields?: {
		values?: Array<{ field1?: string | Expression<string>; field2?: string | Expression<string> }>;
	};
	joinMode?:
		| 'keepMatches'
		| 'keepNonMatches'
		| 'keepEverything'
		| 'enrichInput1'
		| 'enrichInput2'
		| Expression<string>;
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
	| MergeV21ChooseBranchConfig;

/** Combines data of both inputs. The output will contain items of input 1 and input 2. */
export type MergeV1AppendConfig = {
	mode: 'append';
};

/** Keeps data of input 1 if it does find a match with data of input 2 */
export type MergeV1KeepKeyMatchesConfig = {
	mode: 'keepKeyMatches';
	/**
	 * Name of property which decides which items to merge of input 1
	 * @hint The name of the field as text (e.g. “id”)
	 */
	propertyName1: string | Expression<string>;
	/**
	 * Name of property which decides which items to merge of input 2
	 * @hint The name of the field as text (e.g. “id”)
	 */
	propertyName2: string | Expression<string>;
};

/** Merges data of both inputs. The output will contain items of input 1 merged with data of input 2. Merge happens depending on the index of the items. So first item of input 1 will be merged with first item of input 2 and so on. */
export type MergeV1MergeByIndexConfig = {
	mode: 'mergeByIndex';
	/**
	 * How many items the output will contain if inputs contain different amount of items
	 * @default left
	 */
	join?: 'inner' | 'left' | 'outer' | Expression<string>;
};

/** Merges data of both inputs. The output will contain items of input 1 merged with data of input 2. Merge happens depending on a defined key. */
export type MergeV1MergeByKeyConfig = {
	mode: 'mergeByKey';
	/**
	 * Name of property which decides which items to merge of input 1
	 * @hint The name of the field as text (e.g. “id”)
	 */
	propertyName1: string | Expression<string>;
	/**
	 * Name of property which decides which items to merge of input 2
	 * @hint The name of the field as text (e.g. “id”)
	 */
	propertyName2: string | Expression<string>;
	/**
	 * Select when to overwrite the values from Input1 with values from Input 2
	 * @default always
	 */
	overwrite?: 'always' | 'blank' | 'undefined' | Expression<string>;
};

/** Merges each value of one input with each value of the other input. The output will contain (m * n) items where (m) and (n) are lengths of the inputs. */
export type MergeV1MultiplexConfig = {
	mode: 'multiplex';
};

/** Passes through data of one input. The output will contain only items of the defined input. */
export type MergeV1PassThroughConfig = {
	mode: 'passThrough';
	/**
	 * Defines of which input the data should be used as output of node
	 * @default input1
	 */
	output?: 'input1' | 'input2' | Expression<string>;
};

/** Keeps data of input 1 if it does NOT find match with data of input 2 */
export type MergeV1RemoveKeyMatchesConfig = {
	mode: 'removeKeyMatches';
	/**
	 * Name of property which decides which items to merge of input 1
	 * @hint The name of the field as text (e.g. “id”)
	 */
	propertyName1: string | Expression<string>;
	/**
	 * Name of property which decides which items to merge of input 2
	 * @hint The name of the field as text (e.g. “id”)
	 */
	propertyName2: string | Expression<string>;
};

/** Waits till data of both inputs is available and will then output a single empty item. Source Nodes must connect to both Input 1 and 2. This node only supports 2 Sources, if you need more Sources, connect multiple Merge nodes in series. This node will not output any data. */
export type MergeV1WaitConfig = {
	mode: 'wait';
};

export type MergeV1Params =
	| MergeV1AppendConfig
	| MergeV1KeepKeyMatchesConfig
	| MergeV1MergeByIndexConfig
	| MergeV1MergeByKeyConfig
	| MergeV1MultiplexConfig
	| MergeV1PassThroughConfig
	| MergeV1RemoveKeyMatchesConfig
	| MergeV1WaitConfig;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type MergeV32Node = {
	type: 'n8n-nodes-base.merge';
	version: 3 | 3.1 | 3.2;
	config: NodeConfig<MergeV32Params>;
	credentials?: Record<string, never>;
};

export type MergeV21Node = {
	type: 'n8n-nodes-base.merge';
	version: 2 | 2.1;
	config: NodeConfig<MergeV21Params>;
	credentials?: Record<string, never>;
};

export type MergeV1Node = {
	type: 'n8n-nodes-base.merge';
	version: 1;
	config: NodeConfig<MergeV1Params>;
	credentials?: Record<string, never>;
};

export type MergeNode = MergeV32Node | MergeV21Node | MergeV1Node;
