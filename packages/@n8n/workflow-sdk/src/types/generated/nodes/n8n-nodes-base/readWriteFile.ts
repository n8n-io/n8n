/**
 * Read/Write Files from Disk Node Types
 *
 * Read or write files from the computer that runs n8n
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/readwritefile/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ReadWriteFileV11Params {
	operation?: 'read' | 'write' | Expression<string>;
	/**
	 * Specify a file's path or path pattern to read multiple files. Always use forward-slashes for path separator even on Windows.
	 */
	fileSelector: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * Path and name of the file that should be written. Also include the file extension.
	 */
	fileName: string | Expression<string>;
	dataPropertyName: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type ReadWriteFileV11Node = {
	type: 'n8n-nodes-base.readWriteFile';
	version: 1 | 1.1;
	config: NodeConfig<ReadWriteFileV11Params>;
	credentials?: Record<string, never>;
};

export type ReadWriteFileNode = ReadWriteFileV11Node;
