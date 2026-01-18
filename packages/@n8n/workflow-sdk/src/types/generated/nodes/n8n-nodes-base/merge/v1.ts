/**
 * Merge Node - Version 1
 * Merges data of multiple streams once data from both is available
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

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
 * @displayOptions.show { mode: ["keepKeyMatches", "mergeByKey", "removeKeyMatches"] }
 */
		propertyName1: string | Expression<string>;
/**
 * Name of property which decides which items to merge of input 2
 * @hint The name of the field as text (e.g. “id”)
 * @displayOptions.show { mode: ["keepKeyMatches", "mergeByKey", "removeKeyMatches"] }
 */
		propertyName2: string | Expression<string>;
};

/** Merges data of both inputs. The output will contain items of input 1 merged with data of input 2. Merge happens depending on the index of the items. So first item of input 1 will be merged with first item of input 2 and so on. */
export type MergeV1MergeByIndexConfig = {
	mode: 'mergeByIndex';
/**
 * How many items the output will contain if inputs contain different amount of items
 * @displayOptions.show { mode: ["mergeByIndex"] }
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
 * @displayOptions.show { mode: ["keepKeyMatches", "mergeByKey", "removeKeyMatches"] }
 */
		propertyName1: string | Expression<string>;
/**
 * Name of property which decides which items to merge of input 2
 * @hint The name of the field as text (e.g. “id”)
 * @displayOptions.show { mode: ["keepKeyMatches", "mergeByKey", "removeKeyMatches"] }
 */
		propertyName2: string | Expression<string>;
/**
 * Select when to overwrite the values from Input1 with values from Input 2
 * @displayOptions.show { mode: ["mergeByKey"] }
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
 * @displayOptions.show { mode: ["passThrough"] }
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
 * @displayOptions.show { mode: ["keepKeyMatches", "mergeByKey", "removeKeyMatches"] }
 */
		propertyName1: string | Expression<string>;
/**
 * Name of property which decides which items to merge of input 2
 * @hint The name of the field as text (e.g. “id”)
 * @displayOptions.show { mode: ["keepKeyMatches", "mergeByKey", "removeKeyMatches"] }
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
	| MergeV1WaitConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type MergeV1Node = {
	type: 'n8n-nodes-base.merge';
	version: 1;
	config: NodeConfig<MergeV1Params>;
	credentials?: Record<string, never>;
};