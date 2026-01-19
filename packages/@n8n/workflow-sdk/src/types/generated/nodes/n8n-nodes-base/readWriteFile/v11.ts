/**
 * Read/Write Files from Disk Node - Version 1.1
 * Read or write files from the computer that runs n8n
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ReadWriteFileV11Config {
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
// Node Types
// ===========================================================================

interface ReadWriteFileV11NodeBase {
	type: 'n8n-nodes-base.readWriteFile';
	version: 1.1;
}

export type ReadWriteFileV11Node = ReadWriteFileV11NodeBase & {
	config: NodeConfig<ReadWriteFileV11Config>;
};

export type ReadWriteFileV11Node = ReadWriteFileV11Node;