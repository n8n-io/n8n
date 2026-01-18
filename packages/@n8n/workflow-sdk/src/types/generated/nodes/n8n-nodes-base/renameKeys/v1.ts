/**
 * Rename Keys Node - Version 1
 * Update item field names
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RenameKeysV1Params {
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
// Node Type
// ===========================================================================

export type RenameKeysV1Node = {
	type: 'n8n-nodes-base.renameKeys';
	version: 1;
	config: NodeConfig<RenameKeysV1Params>;
	credentials?: Record<string, never>;
};