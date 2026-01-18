/**
 * Read/Write Files from Disk Node - Version 1.1
 * Read or write files from the computer that runs n8n
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ReadWriteFileV11Params {
	operation?: 'read' | 'write' | Expression<string>;
/**
 * Specify a file's path or path pattern to read multiple files. Always use forward-slashes for path separator even on Windows.
 * @hint Supports patterns, learn more &lt;a href="https://github.com/micromatch/picomatch#basic-globbing" target="_blank"&gt;here&lt;/a&gt;
 * @displayOptions.show { operation: ["read"] }
 */
		fileSelector: string | Expression<string>;
	options?: Record<string, unknown>;
/**
 * Path and name of the file that should be written. Also include the file extension.
 * @displayOptions.show { operation: ["write"] }
 */
		fileName: string | Expression<string>;
	dataPropertyName: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type ReadWriteFileV11Node = {
	type: 'n8n-nodes-base.readWriteFile';
	version: 1 | 1.1;
	config: NodeConfig<ReadWriteFileV11Params>;
	credentials?: Record<string, never>;
};