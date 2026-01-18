/**
 * Rename Keys Node Types
 *
 * Update item field names
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/renamekeys/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RenameKeysV1Params {
	/**
	 * Adds a key which should be renamed
	 * @default {}
	 */
	keys?: {
		key?: Array<{ currentKey?: string | Expression<string>; newKey?: string | Expression<string> }>;
	};
	additionalOptions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type RenameKeysV1Node = {
	type: 'n8n-nodes-base.renameKeys';
	version: 1;
	config: NodeConfig<RenameKeysV1Params>;
	credentials?: Record<string, never>;
};

export type RenameKeysNode = RenameKeysV1Node;
