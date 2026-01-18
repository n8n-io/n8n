/**
 * Local File Trigger Node - Version 1
 * Triggers a workflow on file system changes
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LocalFileTriggerV1Params {
	triggerOn: 'file' | 'folder' | Expression<string>;
	path?: string | Expression<string>;
/**
 * The events to listen to
 * @displayOptions.show { triggerOn: ["folder"] }
 * @default []
 */
		events: Array<'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LocalFileTriggerV1Node = {
	type: 'n8n-nodes-base.localFileTrigger';
	version: 1;
	config: NodeConfig<LocalFileTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};