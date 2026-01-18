/**
 * Compression Node Types
 *
 * Compress and decompress files
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/compression/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CompressionV11Params {
	operation?: 'compress' | 'decompress' | Expression<string>;
	/**
	 * To process more than one file, use a comma-separated list of the binary fields names
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Format of the output
	 */
	outputFormat?: 'gzip' | 'zip' | Expression<string>;
	/**
	 * Name of the output file
	 */
	fileName: string | Expression<string>;
	binaryPropertyOutput?: string | Expression<string>;
	/**
	 * Prefix to add to the gzip file
	 * @default data
	 */
	outputPrefix: string | Expression<string>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CompressionNode = {
	type: 'n8n-nodes-base.compression';
	version: 1 | 1.1;
	config: NodeConfig<CompressionV11Params>;
	credentials?: Record<string, never>;
};
