/**
 * Compression Node - Version 1
 * Compress and decompress files
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CompressionV1Params {
	operation?: 'compress' | 'decompress' | Expression<string>;
/**
 * To process more than one file, use a comma-separated list of the binary fields names
 * @hint The name of the input binary field(s) containing the file(s) to be compressed
 * @displayOptions.show { operation: ["compress"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Format of the output
 * @displayOptions.show { operation: ["compress"] }
 */
		outputFormat?: 'gzip' | 'zip' | Expression<string>;
/**
 * Name of the output file
 * @displayOptions.show { operation: ["compress"], outputFormat: ["zip"] }
 */
		fileName: string | Expression<string>;
	binaryPropertyOutput?: string | Expression<string>;
/**
 * Prefix to add to the gzip file
 * @displayOptions.show { operation: ["compress"], outputFormat: ["gzip"] }
 * @default data
 */
		outputPrefix: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface CompressionV1NodeBase {
	type: 'n8n-nodes-base.compression';
	version: 1;
}

export type CompressionV1ParamsNode = CompressionV1NodeBase & {
	config: NodeConfig<CompressionV1Params>;
};

export type CompressionV1Node = CompressionV1ParamsNode;