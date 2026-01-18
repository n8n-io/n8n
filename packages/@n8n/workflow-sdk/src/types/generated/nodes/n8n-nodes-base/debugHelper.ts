/**
 * DebugHelper Node Types
 *
 * Causes problems intentionally and generates useful data for debugging
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/debughelper/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DebugHelperV1Params {
	category?: 'doNothing' | 'throwError' | 'oom' | 'randomData' | Expression<string>;
	throwErrorType?: 'NodeApiError' | 'NodeOperationError' | 'Error' | Expression<string>;
	/**
	 * The message to send as part of the error
	 * @default Node has thrown an error
	 */
	throwErrorMessage?: string | Expression<string>;
	/**
	 * The approximate amount of memory to generate. Be generous...
	 * @default 10
	 */
	memorySizeValue?: number | Expression<number>;
	randomDataType?:
		| 'address'
		| 'latLong'
		| 'creditCard'
		| 'email'
		| 'ipv4'
		| 'ipv6'
		| 'macAddress'
		| 'nanoid'
		| 'url'
		| 'user'
		| 'uuid'
		| 'semver'
		| Expression<string>;
	/**
	 * The alphabet to use for generating the nanoIds
	 * @default 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
	 */
	nanoidAlphabet?: string | Expression<string>;
	/**
	 * The length of each nanoIds
	 * @default 16
	 */
	nanoidLength?: string | Expression<string>;
	/**
	 * If set, seed to use for generating the data (same seed will generate the same data)
	 */
	randomDataSeed?: string | Expression<string>;
	/**
	 * The number of random data items to generate into an array
	 * @default 10
	 */
	randomDataCount?: number | Expression<number>;
	/**
	 * Whether to output a single array instead of multiple items
	 * @default false
	 */
	randomDataSingleArray?: boolean | Expression<boolean>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type DebugHelperNode = {
	type: 'n8n-nodes-base.debugHelper';
	version: 1;
	config: NodeConfig<DebugHelperV1Params>;
	credentials?: Record<string, never>;
};
