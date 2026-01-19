/**
 * Rename Keys Node - Version 1
 * Update item field names
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RenameKeysV1Config {
/**
 * Adds a key which should be renamed
 * @default {}
 */
		keys?: {
		key?: Array<{
			/** The current name of the key. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey".
			 */
			currentKey?: string | Expression<string>;
			/** The name the key should be renamed to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey".
			 */
			newKey?: string | Expression<string>;
		}>;
	};
	additionalOptions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface RenameKeysV1NodeBase {
	type: 'n8n-nodes-base.renameKeys';
	version: 1;
}

export type RenameKeysV1Node = RenameKeysV1NodeBase & {
	config: NodeConfig<RenameKeysV1Config>;
};

export type RenameKeysV1Node = RenameKeysV1Node;