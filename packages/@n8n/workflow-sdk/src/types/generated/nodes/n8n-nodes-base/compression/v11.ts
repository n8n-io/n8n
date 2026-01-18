/**
 * Compression Node - Version 1.1
 * Compress and decompress files
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CompressionV11Params {
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
 * @default zip
 */
		outputFormat?: 'gzip' | 'zip' | Expression<string>;
/**
 * Name of the output file
 * @displayOptions.show { operation: ["compress"], outputFormat: ["zip"] }
 */
		fileName: string | Expression<string>;
	binaryPropertyOutput?: string | Expression<string>;
/**
 * Prefix to add to the decompressed files
 * @displayOptions.show { operation: ["decompress"] }
 * @default file_
 */
		outputPrefix: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type CompressionV11Node = {
	type: 'n8n-nodes-base.compression';
	version: 1.1;
	config: NodeConfig<CompressionV11Params>;
	credentials?: Record<string, never>;
};