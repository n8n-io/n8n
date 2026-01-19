/**
 * DebugHelper Node - Version 1
 * Causes problems intentionally and generates useful data for debugging
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DebugHelperV1Params {
	category?: 'doNothing' | 'throwError' | 'oom' | 'randomData' | Expression<string>;
	throwErrorType?: 'NodeApiError' | 'NodeOperationError' | 'Error' | Expression<string>;
/**
 * The message to send as part of the error
 * @displayOptions.show { category: ["throwError"] }
 * @default Node has thrown an error
 */
		throwErrorMessage?: string | Expression<string>;
/**
 * The approximate amount of memory to generate. Be generous...
 * @displayOptions.show { category: ["oom"] }
 * @default 10
 */
		memorySizeValue?: number | Expression<number>;
	randomDataType?: 'address' | 'latLong' | 'creditCard' | 'email' | 'ipv4' | 'ipv6' | 'macAddress' | 'nanoid' | 'url' | 'user' | 'uuid' | 'semver' | Expression<string>;
/**
 * The alphabet to use for generating the nanoIds
 * @displayOptions.show { category: ["randomData"], randomDataType: ["nanoid"] }
 * @default 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
 */
		nanoidAlphabet?: string | Expression<string>;
/**
 * The length of each nanoIds
 * @displayOptions.show { category: ["randomData"], randomDataType: ["nanoid"] }
 * @default 16
 */
		nanoidLength?: string | Expression<string>;
/**
 * If set, seed to use for generating the data (same seed will generate the same data)
 * @displayOptions.show { category: ["randomData"] }
 */
		randomDataSeed?: string | Expression<string>;
/**
 * The number of random data items to generate into an array
 * @displayOptions.show { category: ["randomData"] }
 * @default 10
 */
		randomDataCount?: number | Expression<number>;
/**
 * Whether to output a single array instead of multiple items
 * @displayOptions.show { category: ["randomData"] }
 * @default false
 */
		randomDataSingleArray?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface DebugHelperV1NodeBase {
	type: 'n8n-nodes-base.debugHelper';
	version: 1;
}

export type DebugHelperV1ParamsNode = DebugHelperV1NodeBase & {
	config: NodeConfig<DebugHelperV1Params>;
};

export type DebugHelperV1Node = DebugHelperV1ParamsNode;